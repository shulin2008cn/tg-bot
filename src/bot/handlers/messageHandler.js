const logger = require('../../utils/logger');
const productService = require('../../services/productService');
const imageService = require('../../services/imageService');
const { config } = require('../../utils/config');

class MessageHandler {
  constructor() {
    this.urlRegex = /(https?:\/\/[^\s]+)/g;
  }

  // 处理文本消息
  async handleTextMessage(ctx) {
    try {
      const message = ctx.message.text;
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;
      
      logger.telegramMessage(chatId, 'text', message);

      // 检查群组权限
      if (!this.isAllowedGroup(chatId)) {
        logger.warn(`未授权的群组访问: ${chatId}`);
        return;
      }

      // 检查是否包含链接
      const urls = message.match(this.urlRegex);
      if (urls && urls.length > 0) {
        await this.handleUrlMessage(ctx, urls[0]);
        return;
      }

      // 如果不是链接，当作商品名称搜索
      if (message.length > 2 && message.length < 100) {
        await this.handleProductSearch(ctx, message);
      }

    } catch (error) {
      logger.botError(error, { 
        chatId: ctx.chat.id, 
        userId: ctx.from.id,
        messageType: 'text'
      });
      await this.sendErrorMessage(ctx, '处理文本消息时出错');
    }
  }

  // 处理图片消息
  async handlePhotoMessage(ctx) {
    try {
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;
      
      logger.telegramMessage(chatId, 'photo', 'image received');

      // 检查群组权限
      if (!this.isAllowedGroup(chatId)) {
        logger.warn(`未授权的群组访问: ${chatId}`);
        return;
      }

      // 发送处理中提示
      const processingMessage = await ctx.reply('🔍 正在识别图片中的商品，请稍候...');

      try {
        // 获取最大尺寸的图片
        const photos = ctx.message.photo;
        const largestPhoto = photos[photos.length - 1];
        
        // 下载图片
        const imageBuffer = await imageService.downloadTelegramImage(ctx.telegram, largestPhoto.file_id);
        
        // 识别商品
        const products = await imageService.recognizeProduct(imageBuffer);
        
        // 删除处理中消息
        await ctx.telegram.deleteMessage(chatId, processingMessage.message_id);
        
        if (products && products.length > 0) {
          // 发送商品卡片
          for (const product of products.slice(0, 3)) { // 最多显示3个结果
            await this.sendProductCard(ctx, product);
          }
        } else {
          await ctx.reply('😅 抱歉，没有识别出相关商品信息');
        }

      } catch (error) {
        // 删除处理中消息
        try {
          await ctx.telegram.deleteMessage(chatId, processingMessage.message_id);
        } catch {}
        throw error;
      }

    } catch (error) {
      logger.botError(error, { 
        chatId: ctx.chat.id, 
        userId: ctx.from.id,
        messageType: 'photo'
      });
      await this.sendErrorMessage(ctx, '处理图片时出错');
    }
  }

  // 处理链接消息
  async handleUrlMessage(ctx, url) {
    try {
      logger.info(`处理商品链接: ${url}`);
      
      // 发送处理中提示
      const processingMessage = await ctx.reply('🔍 正在解析商品信息，请稍候...');

      try {
        // 提取商品信息
        const product = await productService.extractProductFromUrl(url);
        
        // 删除处理中消息
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        
        if (product) {
          await this.sendProductCard(ctx, product);
        } else {
          await ctx.reply('😅 抱歉，无法解析该商品链接');
        }

      } catch (error) {
        // 删除处理中消息
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        } catch {}
        throw error;
      }

    } catch (error) {
      logger.botError(error, { url });
      await this.sendErrorMessage(ctx, '解析商品链接时出错');
    }
  }

  // 处理商品搜索
  async handleProductSearch(ctx, query) {
    try {
      logger.info(`搜索商品: ${query}`);
      
      // 发送处理中提示
      const processingMessage = await ctx.reply('🔍 正在搜索相关商品，请稍候...');

      try {
        // 搜索商品
        const products = await productService.searchProductByName(query);
        
        // 删除处理中消息
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        
        if (products && products.length > 0) {
          // 发送商品卡片
          for (const product of products.slice(0, 3)) { // 最多显示3个结果
            await this.sendProductCard(ctx, product);
          }
        } else {
          await ctx.reply(`😅 抱歉，没有找到关于 "${query}" 的商品信息`);
        }

      } catch (error) {
        // 删除处理中消息
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        } catch {}
        throw error;
      }

    } catch (error) {
      logger.botError(error, { query });
      await this.sendErrorMessage(ctx, '搜索商品时出错');
    }
  }

  // 发送商品卡片
  async sendProductCard(ctx, product) {
    try {
      const caption = this.formatProductCard(product);
      
      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: '🛒 立即购买', 
              url: product.url 
            }
          ],
          [
            { 
              text: '📱 分享商品', 
              switch_inline_query: `${product.title} ${product.price}` 
            }
          ]
        ]
      };

      if (product.image && product.image.startsWith('http')) {
        // 发送带图片的商品卡片
        await ctx.replyWithPhoto(product.image, {
          caption: caption,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        // 发送纯文本商品卡片
        await ctx.reply(caption, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }

    } catch (error) {
      logger.botError(error, { productTitle: product.title });
      // 如果发送图片失败，尝试只发送文本
      try {
        const caption = this.formatProductCard(product);
        await ctx.reply(caption, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 立即购买', url: product.url }]
            ]
          }
        });
      } catch (fallbackError) {
        logger.botError(fallbackError, { productTitle: product.title });
        await ctx.reply('商品信息发送失败');
      }
    }
  }

  // 格式化商品卡片
  formatProductCard(product) {
    const title = this.escapeHtml(product.title);
    const price = this.escapeHtml(product.price);
    const platform = this.escapeHtml(product.platform);
    const description = product.description ? 
      this.escapeHtml(product.description.substring(0, 100)) + 
      (product.description.length > 100 ? '...' : '') : '';

    let card = `🛍️ <b>${title}</b>\n\n`;
    card += `💰 价格: <b>${price}</b>\n`;
    card += `🏪 平台: ${platform}\n`;
    
    if (description) {
      card += `\n📝 ${description}\n`;
    }
    
    if (product.similarity) {
      const similarityPercent = Math.round(product.similarity * 100);
      card += `\n🎯 相似度: ${similarityPercent}%`;
    }

    return card;
  }

  // HTML转义
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // 发送错误消息
  async sendErrorMessage(ctx, message) {
    try {
      await ctx.reply(`❌ ${message}，请稍后重试或联系管理员`);
    } catch (error) {
      logger.botError(error, { originalError: message });
    }
  }

  // 检查群组权限
  isAllowedGroup(chatId) {
    // 如果是私聊（正数ID），总是允许
    if (chatId > 0) {
      return true;
    }
    
    // 如果没有设置允许的群组列表，则允许所有群组
    if (config.telegram.allowedGroupIds.length === 0) {
      return true;
    }
    
    // 检查群组ID是否在允许列表中
    return config.telegram.allowedGroupIds.includes(chatId);
  }

  // 处理命令消息
  async handleCommand(ctx) {
    try {
      const command = ctx.message.text;
      const chatId = ctx.chat.id;
      
      logger.telegramMessage(chatId, 'command', command);

      if (command === '/start') {
        await this.handleStartCommand(ctx);
      } else if (command === '/help') {
        await this.handleHelpCommand(ctx);
      } else if (command === '/status') {
        await this.handleStatusCommand(ctx);
      }

    } catch (error) {
      logger.botError(error, { 
        chatId: ctx.chat.id, 
        command: ctx.message.text
      });
      await this.sendErrorMessage(ctx, '处理命令时出错');
    }
  }

  // 开始命令
  async handleStartCommand(ctx) {
    const welcomeMessage = `🤖 欢迎使用商品问询机器人！

我可以帮助您：
🔍 识别图片中的商品
🔗 解析商品链接信息  
📱 搜索商品名称

使用方法：
• 发送商品图片 - 我会识别并推荐相似商品
• 发送商品链接 - 我会解析商品详情
• 发送商品名称 - 我会搜索相关商品

快来试试吧！`;

    await ctx.reply(welcomeMessage);
  }

  // 帮助命令
  async handleHelpCommand(ctx) {
    const helpMessage = `📖 使用帮助

🖼️ <b>图片识别</b>
发送商品图片，我会自动识别并推荐相似商品

🔗 <b>链接解析</b>
发送商品链接（支持淘宝、天猫、京东、1688等），我会解析出商品详情

🔍 <b>文字搜索</b>
直接发送商品名称，我会搜索相关商品

⚙️ <b>支持的平台</b>
• 淘宝/天猫
• 京东
• 1688
• 亚马逊
• 速卖通

如有问题，请联系管理员。`;

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  }

  // 状态命令
  async handleStatusCommand(ctx) {
    const statusMessage = `📊 机器人状态

🟢 运行正常
⏰ 运行时间: ${process.uptime().toFixed(0)} 秒
💾 内存使用: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
🔧 Node.js 版本: ${process.version}`;

    await ctx.reply(statusMessage);
  }
}

module.exports = new MessageHandler(); 