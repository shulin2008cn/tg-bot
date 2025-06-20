const { Telegraf } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { config } = require('../utils/config');
const logger = require('../utils/logger');
const messageHandler = require('./handlers/messageHandler');
const productService = require('../services/productService');
const imageService = require('../services/imageService');

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
    this.setupHandlers();
    this.setupErrorHandlers();
  }

  // 设置消息处理器
  setupHandlers() {
    // 命令处理
    this.bot.start((ctx) => messageHandler.handleCommand(ctx));
    this.bot.help((ctx) => messageHandler.handleCommand(ctx));
    this.bot.command('status', (ctx) => messageHandler.handleCommand(ctx));

    // 文本消息处理
    this.bot.on('text', (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) {
        return messageHandler.handleCommand(ctx);
      }
      return messageHandler.handleTextMessage(ctx);
    });

    // 图片消息处理
    this.bot.on('photo', (ctx) => messageHandler.handlePhotoMessage(ctx));

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
        logger.info(`回调查询: ${ctx.callbackQuery.data}`);
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
        { command: 'status', description: '查看机器人状态' }
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
}

module.exports = TelegramBot; 