const { Telegraf } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { config } = require('../utils/config');
const logger = require('../utils/logger');
const messageHandler = require('./handlers/messageHandler');
const productService = require('../services/productService');
const imageService = require('../services/imageService');
const PushService = require('../services/pushService');
const GroupInfoCollector = require('../../scripts/getGroupInfo');

class TelegramBot {
  constructor() {
    // 创建机器人实例，如果配置了代理则使用代理
    const botOptions = {};
    
    if (config.proxy && config.proxy.enabled) {
      logger.info(`使用代理: ${config.proxy.host}:${config.proxy.port}`);
      const proxyAgent = new HttpsProxyAgent(`http://${config.proxy.host}:${config.proxy.port}`);
      botOptions.telegram = {
        agent: proxyAgent
      };
    }
    
    this.bot = new Telegraf(config.telegram.botToken, botOptions);
    this.isRunning = false;
    
    // 初始化推送服务
    this.pushService = new PushService(this);
    
    // 初始化群组信息收集器
    this.groupCollector = new GroupInfoCollector();
    
    this.setupHandlers();
    this.setupErrorHandlers();
  }

  // 设置消息处理器
  setupHandlers() {
    // 命令处理
    this.bot.start((ctx) => messageHandler.handleCommand(ctx));
    this.bot.help((ctx) => messageHandler.handleCommand(ctx));
    this.bot.command('status', (ctx) => messageHandler.handleCommand(ctx));
    
    // 推送相关命令
    this.bot.command('subscribe', (ctx) => this.handleSubscribeCommand(ctx));
    this.bot.command('unsubscribe', (ctx) => this.handleUnsubscribeCommand(ctx));
    this.bot.command('push_settings', (ctx) => this.handlePushSettingsCommand(ctx));
    this.bot.command('push_status', (ctx) => this.handlePushStatusCommand(ctx));
    
    // 管理员命令
    this.bot.command('admin_broadcast', (ctx) => this.handleAdminBroadcastCommand(ctx));
    this.bot.command('push_stats', (ctx) => this.handlePushStatsCommand(ctx));

    // 文本消息处理
    this.bot.on('text', (ctx) => {
      // 记录群组信息
      this.groupCollector.recordGroup(ctx);
      
      const text = ctx.message.text;
      if (text.startsWith('/')) {
        return messageHandler.handleCommand(ctx);
      }
      return messageHandler.handleTextMessage(ctx);
    });

    // 图片消息处理
    this.bot.on('photo', (ctx) => {
      // 记录群组信息
      this.groupCollector.recordGroup(ctx);
      return messageHandler.handlePhotoMessage(ctx);
    });

    // 处理文档中的图片
    this.bot.on('document', async (ctx) => {
      try {
        const document = ctx.message.document;
        if (document.mime_type && document.mime_type.startsWith('image/')) {
          // 将文档当作图片处理
          const imageBuffer = await imageService.downloadTelegramImage(ctx.telegram, document.file_id);
          const products = await imageService.recognizeProduct(imageBuffer);
          
          if (products && products.length > 0) {
            for (const product of products.slice(0, 3)) {
              await messageHandler.sendProductCard(ctx, product);
            }
          } else {
            await ctx.reply('😅 抱歉，没有识别出相关商品信息');
          }
        }
      } catch (error) {
        logger.botError(error, { 
          chatId: ctx.chat.id, 
          messageType: 'document'
        });
        await messageHandler.sendErrorMessage(ctx, '处理文档时出错');
      }
    });

    // 处理内联查询
    this.bot.on('inline_query', async (ctx) => {
      try {
        const query = ctx.inlineQuery.query;
        logger.info(`内联查询: ${query}`);
        
        if (query.length < 2) {
          await ctx.answerInlineQuery([]);
          return;
        }

        // 搜索商品
        const products = await productService.searchProductByName(query);
        const results = products.slice(0, 10).map((product, index) => ({
          type: 'article',
          id: index.toString(),
          title: product.title,
          description: `${product.price} - ${product.platform}`,
          thumb_url: product.image || 'https://via.placeholder.com/100x100?text=Product',
          input_message_content: {
            message_text: messageHandler.formatProductCard(product),
            parse_mode: 'HTML'
          },
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 立即购买', url: product.url }]
            ]
          }
        }));

        await ctx.answerInlineQuery(results, {
          cache_time: 300,
          is_personal: true
        });

      } catch (error) {
        logger.botError(error, { 
          query: ctx.inlineQuery.query,
          messageType: 'inline_query'
        });
        await ctx.answerInlineQuery([]);
      }
    });

    // 处理回调查询
    this.bot.on('callback_query', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const callbackData = ctx.callbackQuery.data;
        logger.info(`回调查询: ${callbackData}`);
        
        // 处理推送相关回调
        if (callbackData.startsWith('unsubscribe_')) {
          const chatId = parseInt(callbackData.split('_')[1]);
          await this.handleUnsubscribeCallback(ctx, chatId);
        } else if (callbackData.startsWith('setting_')) {
          await this.handleSettingCallback(ctx, callbackData);
        } else if (callbackData === 'quick_subscribe') {
          await this.handleQuickSubscribeCallback(ctx);
        } else if (callbackData === 'show_help') {
          await this.handleShowHelpCallback(ctx);
        }
        
      } catch (error) {
        logger.botError(error, { 
          callbackData: ctx.callbackQuery.data,
          messageType: 'callback_query'
        });
      }
    });

    // 处理新成员加入
    this.bot.on('new_chat_members', async (ctx) => {
      try {
        const newMembers = ctx.message.new_chat_members;
        const botInfo = await ctx.telegram.getMe();
        
        // 检查是否机器人被添加到群组
        const botAdded = newMembers.some(member => member.id === botInfo.id);
        
        if (botAdded) {
          logger.info(`机器人被添加到群组: ${ctx.chat.id} (${ctx.chat.title})`);
          
          const welcomeMessage = `👋 大家好！我是商品问询机器人
          
🤖 我可以帮助大家：
• 识别图片中的商品
• 解析商品链接信息
• 搜索商品名称

💡 使用提示：
• 直接发送商品图片或链接
• 输入 /help 查看详细帮助
• 输入 /status 查看机器人状态

让我们开始吧！🚀`;

          await ctx.reply(welcomeMessage);
        }
      } catch (error) {
        logger.botError(error, { 
          chatId: ctx.chat.id,
          messageType: 'new_chat_members'
        });
      }
    });

    logger.info('消息处理器设置完成');
  }

  // 设置错误处理器
  setupErrorHandlers() {
    this.bot.catch((err, ctx) => {
      logger.botError(err, {
        chatId: ctx.chat?.id,
        userId: ctx.from?.id,
        messageType: ctx.updateType
      });
    });

    // 处理未捕获的异常
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常', { error: error.stack });
      process.exit(1);
    });

    logger.info('错误处理器设置完成');
  }

  // 启动机器人
  async start() {
    try {
      if (this.isRunning) {
        logger.warn('机器人已经在运行中');
        return;
      }

      logger.info('正在启动Telegram机器人...');
      
      // 获取机器人信息
      const botInfo = await this.bot.telegram.getMe();
      logger.info(`机器人信息: ${botInfo.first_name} (@${botInfo.username})`);

      // 设置机器人命令
      await this.setupBotCommands();

      // 启动机器人
      await this.bot.launch();
      this.isRunning = true;

      logger.info('✅ Telegram机器人启动成功');
      logger.info(`机器人用户名: @${botInfo.username}`);
      logger.info(`机器人ID: ${botInfo.id}`);

    } catch (error) {
      logger.botError(error, { action: 'start' });
      throw error;
    }
  }

  // 停止机器人
  async stop() {
    try {
      if (!this.isRunning) {
        logger.warn('机器人未在运行');
        return;
      }

      logger.info('正在停止Telegram机器人...');
      
      // 停止推送服务
      if (this.pushService) {
        await this.pushService.stop();
      }
      
      this.bot.stop();
      this.isRunning = false;
      logger.info('✅ Telegram机器人已停止');

    } catch (error) {
      logger.botError(error, { action: 'stop' });
      throw error;
    }
  }

  // 设置机器人命令
  async setupBotCommands() {
    try {
      const commands = [
        { command: 'start', description: '开始使用机器人' },
        { command: 'help', description: '查看帮助信息' },
        { command: 'status', description: '查看机器人状态' },
        { command: 'subscribe', description: '订阅推送服务' },
        { command: 'unsubscribe', description: '取消推送订阅' },
        { command: 'push_settings', description: '推送设置' },
        { command: 'push_status', description: '查看推送状态' }
      ];

      await this.bot.telegram.setMyCommands(commands);
      logger.info('机器人命令设置完成');

    } catch (error) {
      logger.botError(error, { action: 'setupBotCommands' });
      throw error;
    }
  }

  // 获取机器人状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };
  }

  // 发送消息到指定聊天
  async sendMessage(chatId, message, options = {}) {
    try {
      return await this.bot.telegram.sendMessage(chatId, message, options);
    } catch (error) {
      logger.botError(error, { chatId, action: 'sendMessage' });
      throw error;
    }
  }

  // 发送图片到指定聊天
  async sendPhoto(chatId, photo, options = {}) {
    try {
      return await this.bot.telegram.sendPhoto(chatId, photo, options);
    } catch (error) {
      logger.botError(error, { chatId, action: 'sendPhoto' });
      throw error;
    }
  }

  // === 推送相关命令处理方法 ===

  // 处理订阅命令
  async handleSubscribeCommand(ctx) {
    try {
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;
      
      const subscriber = await this.pushService.addSubscriber(chatId, userId);
      
      const message = `✅ <b>订阅成功！</b>

🎯 您已成功订阅以下推送服务：
• 📦 每日商品推荐
• 🎉 促销活动通知

⚙️ 使用 /push_settings 自定义推送偏好
📊 使用 /push_status 查看订阅状态
❌ 使用 /unsubscribe 取消订阅

感谢您的使用！🙏`;

      await ctx.reply(message, { parse_mode: 'HTML' });
      
      logger.info(`用户订阅推送: ${chatId} (${userId})`);
      
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'subscribe' });
      await ctx.reply('❌ 订阅失败，请稍后重试');
    }
  }

  // 处理取消订阅命令
  async handleUnsubscribeCommand(ctx) {
    try {
      const chatId = ctx.chat.id;
      
      const success = await this.pushService.removeSubscriber(chatId);
      
      if (success) {
        await ctx.reply('✅ 已成功取消所有推送订阅\n\n如需重新订阅，请使用 /subscribe 命令');
        logger.info(`用户取消订阅: ${chatId}`);
      } else {
        await ctx.reply('❌ 您还没有订阅推送服务\n\n使用 /subscribe 开始订阅');
      }
      
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'unsubscribe' });
      await ctx.reply('❌ 取消订阅失败，请稍后重试');
    }
  }

  // 处理推送设置命令
  async handlePushSettingsCommand(ctx) {
    try {
      const chatId = ctx.chat.id;
      const subscriber = this.pushService.subscribers.get(chatId);
      
      if (!subscriber) {
        await ctx.reply('❌ 您还没有订阅推送服务\n\n使用 /subscribe 开始订阅');
        return;
      }
      
      const preferences = subscriber.preferences;
      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: `📦 每日推荐 ${preferences.dailyRecommendation ? '✅' : '❌'}`, 
              callback_data: 'setting_dailyRecommendation' 
            }
          ],
          [
            { 
              text: `🎉 促销通知 ${preferences.promotions ? '✅' : '❌'}`, 
              callback_data: 'setting_promotions' 
            }
          ],
          [
            { 
              text: `💰 价格提醒 ${preferences.priceAlert ? '✅' : '❌'}`, 
              callback_data: 'setting_priceAlert' 
            }
          ],
          [
            { 
              text: `🆕 新品通知 ${preferences.newProducts ? '✅' : '❌'}`, 
              callback_data: 'setting_newProducts' 
            }
          ]
        ]
      };
      
      const message = `⚙️ <b>推送设置</b>

点击下方按钮切换对应功能的开关状态：

📦 每日推荐: 每天为您推荐精选商品
🎉 促销通知: 及时获取优惠促销信息  
💰 价格提醒: 关注商品价格变化
🆕 新品通知: 第一时间了解新品上架

当前订阅时间: ${new Date(subscriber.joinTime).toLocaleString('zh-CN')}`;

      await ctx.reply(message, { 
        parse_mode: 'HTML',
        reply_markup: keyboard 
      });
      
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'push_settings' });
      await ctx.reply('❌ 获取设置失败，请稍后重试');
    }
  }

  // 处理推送状态命令
  async handlePushStatusCommand(ctx) {
    try {
      const chatId = ctx.chat.id;
      const subscriber = this.pushService.subscribers.get(chatId);
      
      if (!subscriber) {
        await ctx.reply('❌ 您还没有订阅推送服务\n\n使用 /subscribe 开始订阅');
        return;
      }
      
      const pushStatus = this.pushService.getStatus();
      const preferences = subscriber.preferences;
      
      let enabledFeatures = [];
      if (preferences.dailyRecommendation) enabledFeatures.push('📦 每日推荐');
      if (preferences.promotions) enabledFeatures.push('🎉 促销通知');
      if (preferences.priceAlert) enabledFeatures.push('💰 价格提醒');
      if (preferences.newProducts) enabledFeatures.push('🆕 新品通知');
      
      const message = `📊 <b>推送状态</b>

👤 <b>个人订阅信息</b>
• 订阅状态: ${subscriber.active ? '✅ 活跃' : '❌ 已停用'}
• 订阅时间: ${new Date(subscriber.joinTime).toLocaleString('zh-CN')}
• 已启用功能: ${enabledFeatures.length > 0 ? enabledFeatures.join(', ') : '无'}

📈 <b>系统统计</b>
• 总订阅者: ${pushStatus.subscribersCount}
• 活跃订阅者: ${pushStatus.activeSubscribersCount}
• 定时任务: ${pushStatus.scheduledJobsCount}个
• 服务状态: ${pushStatus.isRunning ? '🟢 运行中' : '🔴 已停止'}`;

      await ctx.reply(message, { parse_mode: 'HTML' });
      
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'push_status' });
      await ctx.reply('❌ 获取状态失败，请稍后重试');
    }
  }

  // 处理管理员广播命令
  async handleAdminBroadcastCommand(ctx) {
    try {
      const userId = ctx.from.id;
      
      if (!this.pushService.isAdmin(userId)) {
        await ctx.reply('❌ 您没有权限执行此操作');
        return;
      }
      
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length === 0) {
        await ctx.reply(`📢 <b>管理员广播</b>

用法: /admin_broadcast <消息内容>

示例: /admin_broadcast 系统维护通知：明天上午10点进行系统更新，预计耗时30分钟。`, 
          { parse_mode: 'HTML' });
        return;
      }
      
      const broadcastMessage = args.join(' ');
      const result = await this.pushService.adminBroadcast(userId, broadcastMessage);
      
      await ctx.reply(`✅ 广播发送完成

📊 发送统计:
• 成功: ${result.successCount}
• 失败: ${result.failureCount}  
• 总计: ${result.totalCount}`);
      
      logger.info(`管理员广播完成: ${userId}, 成功: ${result.successCount}, 失败: ${result.failureCount}`);
      
    } catch (error) {
      logger.botError(error, { userId: ctx.from.id, action: 'admin_broadcast' });
      await ctx.reply('❌ 广播发送失败，请稍后重试');
    }
  }

  // 处理推送统计命令
  async handlePushStatsCommand(ctx) {
    try {
      const userId = ctx.from.id;
      
      if (!this.pushService.isAdmin(userId)) {
        await ctx.reply('❌ 您没有权限查看此信息');
        return;
      }
      
      const stats = this.pushService.getStatus();
      const botStatus = this.getStatus();
      
      const message = `📊 <b>推送服务统计</b>

👥 <b>订阅者统计</b>
• 总订阅者: ${stats.subscribersCount}
• 活跃订阅者: ${stats.activeSubscribersCount}
• 非活跃订阅者: ${stats.subscribersCount - stats.activeSubscribersCount}

⏰ <b>定时任务</b>
• 活跃任务数: ${stats.scheduledJobsCount}
• 服务状态: ${stats.isRunning ? '🟢 运行中' : '🔴 已停止'}

🤖 <b>机器人状态</b>
• 运行状态: ${botStatus.isRunning ? '🟢 在线' : '🔴 离线'}
• 运行时长: ${Math.floor(botStatus.uptime / 3600)}小时${Math.floor((botStatus.uptime % 3600) / 60)}分钟
• 内存使用: ${Math.round(botStatus.memoryUsage.used / 1024 / 1024)}MB
• Node版本: ${botStatus.nodeVersion}`;

      await ctx.reply(message, { parse_mode: 'HTML' });
      
    } catch (error) {
      logger.botError(error, { userId: ctx.from.id, action: 'push_stats' });
      await ctx.reply('❌ 获取统计信息失败');
    }
  }

  // 处理取消订阅回调
  async handleUnsubscribeCallback(ctx, chatId) {
    try {
      const success = await this.pushService.removeSubscriber(chatId);
      
      if (success) {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply('✅ 已成功取消推送订阅');
      } else {
        await ctx.reply('❌ 取消订阅失败');
      }
      
    } catch (error) {
      logger.botError(error, { chatId, action: 'unsubscribe_callback' });
      await ctx.reply('❌ 操作失败，请稍后重试');
    }
  }

  // 处理设置回调
  async handleSettingCallback(ctx, callbackData) {
    try {
      const chatId = ctx.chat.id;
      const settingKey = callbackData.replace('setting_', '');
      
      const subscriber = this.pushService.subscribers.get(chatId);
      if (!subscriber) {
        await ctx.reply('❌ 您还没有订阅推送服务');
        return;
      }
      
      // 切换设置
      const newValue = !subscriber.preferences[settingKey];
      await this.pushService.updateSubscriberPreferences(chatId, {
        [settingKey]: newValue
      });
      
      // 更新按钮显示
      await this.handlePushSettingsCommand(ctx);
      
      const settingNames = {
        dailyRecommendation: '每日推荐',
        promotions: '促销通知', 
        priceAlert: '价格提醒',
        newProducts: '新品通知'
      };
      
      await ctx.answerCbQuery(`${settingNames[settingKey]} 已${newValue ? '开启' : '关闭'}`);
      
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'setting_callback' });
      await ctx.answerCbQuery('操作失败，请稍后重试');
    }
  }

  // 处理快速订阅回调
  async handleQuickSubscribeCallback(ctx) {
    try {
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;
      
      // 检查是否已经订阅
      const existingSubscriber = this.pushService.subscribers.get(chatId);
      if (existingSubscriber) {
        await ctx.answerCbQuery('您已经订阅了推送服务');
        await ctx.reply('✅ 您已经是我们的订阅者了！\n\n使用 /push_settings 管理您的推送偏好');
        return;
      }
      
      // 添加订阅者
      await this.pushService.addSubscriber(chatId, userId);
      
      await ctx.answerCbQuery('订阅成功！');
      await ctx.reply(`🎉 <b>订阅成功！</b>

欢迎加入我们的推送服务！您将收到：
• 📦 每日精选商品推荐
• 🎉 限时促销活动通知

⚙️ 使用 /push_settings 自定义推送偏好
📊 使用 /push_status 查看订阅状态

感谢您的信任！🙏`, { parse_mode: 'HTML' });
      
      logger.info(`快速订阅成功: ${chatId} (${userId})`);
      
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'quick_subscribe' });
      await ctx.answerCbQuery('订阅失败，请稍后重试');
    }
  }

  // 处理显示帮助回调
  async handleShowHelpCallback(ctx) {
    try {
      await ctx.answerCbQuery();
      await messageHandler.handleHelpCommand(ctx);
    } catch (error) {
      logger.botError(error, { chatId: ctx.chat.id, action: 'show_help' });
      await ctx.answerCbQuery('获取帮助失败');
    }
  }
}

module.exports = TelegramBot; 