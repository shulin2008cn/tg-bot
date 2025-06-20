const { config } = require('./config');

class Logger {
  constructor() {
    this.isDev = config.server.env === 'development';
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    if (this.isDev) {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
      if (data) {
        console.log('数据:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  debug(message, data) {
    if (this.isDev) {
      this.log('debug', message, data);
    }
  }

  // 特定的Telegram相关日志方法
  telegramMessage(chatId, messageType, content) {
    this.info(`Telegram消息 - 聊天ID: ${chatId}, 类型: ${messageType}`, {
      chatId,
      messageType,
      contentPreview: typeof content === 'string' ? content.substring(0, 100) : 'non-text'
    });
  }

  productSearch(query, results) {
    this.info(`商品搜索 - 查询: "${query}", 结果数量: ${results ? results.length : 0}`, {
      query,
      resultCount: results ? results.length : 0
    });
  }

  botError(error, context) {
    this.error(`机器人错误: ${error.message}`, {
      error: error.stack,
      context
    });
  }
}

const logger = new Logger();

module.exports = logger; 