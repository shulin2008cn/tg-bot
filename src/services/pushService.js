const logger = require('../utils/logger');
const { config } = require('../utils/config');
const productService = require('./productService');
const fs = require('fs').promises;
const path = require('path');

class PushService {
  constructor(bot) {
    this.bot = bot;
    this.scheduledJobs = new Map(); // 存储定时任务
    this.subscribers = new Map(); // 存储订阅者信息
    this.subscribersFile = path.join(process.cwd(), 'data', 'subscribers.json');
    this.init();
  }

  async init() {
    try {
      // 确保数据目录存在
      await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
      
      // 加载订阅者数据
      await this.loadSubscribers();
      
      // 启动定时任务
      this.startScheduledTasks();
      
      logger.info('推送服务初始化完成');
    } catch (error) {
      logger.error('推送服务初始化失败', error);
    }
  }

  // 加载订阅者数据
  async loadSubscribers() {
    try {
      const data = await fs.readFile(this.subscribersFile, 'utf8');
      const subscribers = JSON.parse(data);
      this.subscribers = new Map(subscribers);
      logger.info(`加载了 ${this.subscribers.size} 个订阅者`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('加载订阅者数据失败', error);
      }
      // 文件不存在是正常的，创建空的订阅者映射
      this.subscribers = new Map();
    }
  }

  // 保存订阅者数据
  async saveSubscribers() {
    try {
      const data = JSON.stringify([...this.subscribers], null, 2);
      await fs.writeFile(this.subscribersFile, data, 'utf8');
      logger.info('订阅者数据已保存');
    } catch (error) {
      logger.error('保存订阅者数据失败', error);
    }
  }

  // 添加订阅者
  async addSubscriber(chatId, userId, preferences = {}) {
    const subscriber = {
      chatId,
      userId,
      joinTime: new Date().toISOString(),
      preferences: {
        dailyRecommendation: true, // 每日推荐
        priceAlert: false,         // 价格提醒
        newProducts: false,        // 新品通知
        promotions: true,          // 促销信息
        ...preferences
      },
      active: true
    };

    this.subscribers.set(chatId, subscriber);
    await this.saveSubscribers();
    
    logger.info(`新增订阅者: ${chatId} (用户: ${userId})`);
    return subscriber;
  }

  // 移除订阅者
  async removeSubscriber(chatId) {
    if (this.subscribers.delete(chatId)) {
      await this.saveSubscribers();
      logger.info(`移除订阅者: ${chatId}`);
      return true;
    }
    return false;
  }

  // 更新订阅者偏好
  async updateSubscriberPreferences(chatId, preferences) {
    const subscriber = this.subscribers.get(chatId);
    if (subscriber) {
      subscriber.preferences = { ...subscriber.preferences, ...preferences };
      this.subscribers.set(chatId, subscriber);
      await this.saveSubscribers();
      logger.info(`更新订阅者偏好: ${chatId}`);
      return true;
    }
    return false;
  }

  // 获取活跃订阅者
  getActiveSubscribers(filterFn = null) {
    const activeSubscribers = [...this.subscribers.values()]
      .filter(sub => sub.active);
    
    if (filterFn) {
      return activeSubscribers.filter(filterFn);
    }
    
    return activeSubscribers;
  }

  // 发送推送消息到单个用户
  async sendPushMessage(chatId, message, options = {}) {
    try {
      if (typeof message === 'string') {
        return await this.bot.sendMessage(chatId, message, options);
      } else if (message.type === 'photo') {
        return await this.bot.sendPhoto(chatId, message.photo, {
          caption: message.caption,
          ...options
        });
      } else if (message.type === 'product') {
        return await this.sendProductPush(chatId, message.product, options);
      }
    } catch (error) {
      logger.error(`发送推送消息失败 (${chatId})`, error);
      
      // 如果是用户阻止机器人，标记为非活跃
      if (error.code === 403) {
        const subscriber = this.subscribers.get(chatId);
        if (subscriber) {
          subscriber.active = false;
          this.subscribers.set(chatId, subscriber);
          await this.saveSubscribers();
        }
      }
      
      throw error;
    }
  }

  // 发送商品推送
  async sendProductPush(chatId, product, options = {}) {
    const message = `🔥 <b>商品推荐</b>

📦 <b>${product.title}</b>
💰 价格: <b>${product.price}</b>
🏪 平台: ${product.platform}

${product.description ? `📝 ${product.description}` : ''}

⏰ ${new Date().toLocaleString('zh-CN')}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🛒 立即购买', url: product.url }],
        [{ text: '❌ 取消订阅', callback_data: `unsubscribe_${chatId}` }]
      ]
    };

    if (product.image) {
      return await this.bot.sendPhoto(chatId, product.image, {
        caption: message,
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...options
      });
    } else {
      return await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...options
      });
    }
  }

  // 广播推送消息
  async broadcastMessage(message, options = {}) {
    const { filterFn, batchSize = 50, delay = 1000 } = options;
    const subscribers = this.getActiveSubscribers(filterFn);
    
    logger.info(`开始广播推送，目标用户数: ${subscribers.length}`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // 分批发送避免触发限制
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const promises = batch.map(async (subscriber) => {
        try {
          await this.sendPushMessage(subscriber.chatId, message);
          successCount++;
        } catch (error) {
          failureCount++;
          logger.error(`广播发送失败: ${subscriber.chatId}`, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      // 批次间延迟
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    logger.info(`广播完成 - 成功: ${successCount}, 失败: ${failureCount}`);
    return { successCount, failureCount, totalCount: subscribers.length };
  }

  // 每日推荐推送
  async sendDailyRecommendation() {
    try {
      logger.info('开始发送每日推荐');
      
      // 获取推荐商品（这里使用模拟数据，实际可接入真实API）
      const recommendedProducts = await this.getDailyRecommendedProducts();
      
      if (recommendedProducts.length === 0) {
        logger.warn('没有可推荐的商品');
        return;
      }
      
      // 筛选订阅每日推荐的用户
      const filterFn = (subscriber) => subscriber.preferences.dailyRecommendation;
      
      // 发送每日推荐汇总消息
      const message = this.formatRecommendationMessage(recommendedProducts.slice(0, 5));
      
      const result = await this.broadcastMessage(message, { 
        filterFn,
        options: { parse_mode: 'HTML' }
      });
      
      logger.info(`每日推荐发送完成 - 成功: ${result.successCount}, 失败: ${result.failureCount}`);
      return result;
    } catch (error) {
      logger.error('发送每日推荐失败', error);
      throw error;
    }
  }

  // 获取每日推荐商品
  async getDailyRecommendedProducts() {
    try {
      // 这里可以接入真实的推荐算法或API
      // 目前返回模拟数据
      const categories = ['数码产品', '家居用品', '服装配饰', '美妆护肤', '运动户外'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      const products = await productService.searchProductByName(randomCategory);
      return products.slice(0, 5); // 返回前5个商品
    } catch (error) {
      logger.error('获取推荐商品失败', error);
      return [];
    }
  }

  // 发送促销信息
  async sendPromotionAlert(promotion) {
    const message = `🎉 <b>限时促销</b>

🏷️ <b>${promotion.title}</b>
💸 优惠: <b>${promotion.discount}</b>
⏰ 有效期至: ${promotion.endTime}

${promotion.description || ''}

🔥 机会难得，不要错过！`;

    const filterFn = (subscriber) => subscriber.preferences.promotions;
    
    return await this.broadcastMessage(message, { 
      filterFn,
      options: { parse_mode: 'HTML' }
    });
  }

  // 发送价格提醒
  async sendPriceAlert(chatId, product, oldPrice, newPrice) {
    const change = newPrice - oldPrice;
    const changePercent = ((change / oldPrice) * 100).toFixed(1);
    const isDecrease = change < 0;
    
    const message = `📊 <b>价格${isDecrease ? '下降' : '上涨'}提醒</b>

📦 <b>${product.title}</b>
${isDecrease ? '📉' : '📈'} 价格变动: ${oldPrice} → <b>${newPrice}</b>
${isDecrease ? '💰' : '📈'} 变动幅度: ${isDecrease ? '' : '+'}${changePercent}%

${isDecrease ? '🎉 现在是购买的好时机！' : '💭 建议再观察一下价格趋势。'}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🛒 立即购买', url: product.url }],
        [{ text: '🔕 停止此商品提醒', callback_data: `stop_alert_${product.id}` }]
      ]
    };

    return await this.sendPushMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // 管理员推送
  async adminBroadcast(adminUserId, message, options = {}) {
    // 验证管理员权限
    if (!this.isAdmin(adminUserId)) {
      throw new Error('无权限执行广播操作');
    }
    
    logger.info(`管理员 ${adminUserId} 发起广播`);
    
    return await this.broadcastMessage(message, options);
  }

  // 检查是否为管理员
  isAdmin(userId) {
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => parseInt(id.trim()));
    return adminIds.includes(userId);
  }

  // 启动定时任务
  startScheduledTasks() {
    // 每日推荐 - 每天上午9点
    this.scheduleJob('dailyRecommendation', '0 9 * * *', () => {
      this.sendDailyRecommendation();
    });
    
    // 每周统计报告 - 每周一上午10点
    this.scheduleJob('weeklyReport', '0 10 * * 1', () => {
      this.sendWeeklyReport();
    });
    
    logger.info('定时任务已启动');
  }

  // 调度任务
  scheduleJob(name, cronPattern, job) {
    // 简单的定时实现，实际项目建议使用 node-cron
    const scheduleId = setInterval(() => {
      const now = new Date();
      const shouldRun = this.shouldRunCronJob(cronPattern, now);
      
      if (shouldRun) {
        logger.info(`执行定时任务: ${name}`);
        job();
      }
    }, 60000); // 每分钟检查一次
    
    this.scheduledJobs.set(name, scheduleId);
  }

  // 简单的Cron表达式检查（实际项目建议使用专业库）
  shouldRunCronJob(pattern, now) {
    // 这是一个简化版本，仅支持基本格式
    // 实际使用建议用 node-cron 库
    if (pattern === '0 9 * * *') {
      return now.getHours() === 9 && now.getMinutes() === 0;
    }
    if (pattern === '0 10 * * 1') {
      return now.getDay() === 1 && now.getHours() === 10 && now.getMinutes() === 0;
    }
    return false;
  }

  // 发送周报
  async sendWeeklyReport() {
    try {
      const stats = this.getWeeklyStats();
      const message = `📊 <b>本周统计报告</b>

👥 活跃订阅者: ${stats.activeSubscribers}
📤 推送消息数: ${stats.messagesSent}
🔍 商品查询次数: ${stats.productQueries}
📈 新增订阅者: ${stats.newSubscribers}

感谢大家的使用！🙏`;

      // 只发送给启用了报告的订阅者
      const filterFn = (subscriber) => subscriber.preferences.weeklyReport;
      
      await this.broadcastMessage(message, { 
        filterFn,
        options: { parse_mode: 'HTML' }
      });
      
      logger.info('周报发送完成');
    } catch (error) {
      logger.error('发送周报失败', error);
    }
  }

  // 获取周统计
  getWeeklyStats() {
    // 这里应该从数据库或日志中获取实际统计数据
    return {
      activeSubscribers: this.getActiveSubscribers().length,
      messagesSent: Math.floor(Math.random() * 1000),
      productQueries: Math.floor(Math.random() * 500),
      newSubscribers: Math.floor(Math.random() * 50)
    };
  }

  // 停止推送服务
  async stop() {
    // 清理定时任务
    for (const [name, scheduleId] of this.scheduledJobs) {
      clearInterval(scheduleId);
      logger.info(`停止定时任务: ${name}`);
    }
    
    this.scheduledJobs.clear();
    
    // 保存订阅者数据
    await this.saveSubscribers();
    
    logger.info('推送服务已停止');
  }

  // 获取服务状态
  getStatus() {
    return {
      subscribersCount: this.subscribers.size,
      activeSubscribersCount: this.getActiveSubscribers().length,
      scheduledJobsCount: this.scheduledJobs.size,
      isRunning: this.scheduledJobs.size > 0
    };
  }

  // 格式化推荐商品消息
  formatRecommendationMessage(products) {
    const cardConfig = require('../utils/config').config.productCard;
    
    let message = `🏆 <b>${cardConfig.brandName} - Daily Product Recommendations</b>\n\n`;
    message += `📅 <b>${new Date().toLocaleDateString('zh-CN')}</b>\n\n`;
    
    products.forEach((product, index) => {
      message += `<b>${index + 1}. ${this.escapeHtml(product.title)}</b>\n`;
      message += `💰 Price: <b>${this.escapeHtml(product.price)}</b>\n`;
      message += `🔍 <a href="${product.url}">Link Here</a>\n`;
      message += `🔍 <a href="https://www.google.com/search?q=${encodeURIComponent(product.title)}">Search more QC</a>\n\n`;
    });
    
    // 添加联系方式和机器人信息
    message += `🔗 Find more items <a href="https://wa.me/${cardConfig.whatsappNumber}">WhatsApp</a> & <a href="https://discord.gg/${cardConfig.discordInvite}">discord</a>\n\n`;
    message += `🤖 <a href="https://t.me/${cardConfig.botUsername}">${cardConfig.brandName}-bot</a>\n`;
    message += `👉 Visit <a href="${cardConfig.muleBuyBaseUrl}">mulebuy</a> for more products`;
    
    return message;
  }

  // HTML转义（推送服务专用）
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

module.exports = PushService; 