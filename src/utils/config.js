require('dotenv').config();

const config = {
  // Telegram Bot配置
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    allowedGroupIds: process.env.ALLOWED_GROUP_IDS 
      ? process.env.ALLOWED_GROUP_IDS.split(',').map(id => parseInt(id.trim()))
      : []
  },

  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // 商品API配置
  productApi: {
    key: process.env.PRODUCT_API_KEY,
    url: process.env.PRODUCT_API_URL
  },

  // 代理配置
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    host: process.env.PROXY_HOST || 'localhost',
    port: process.env.PROXY_PORT || '7890'
  },

  // 其他配置
  features: {
    enableImageProcessing: true,
    enableLinkProcessing: true,
    enableTextSearch: true,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxResponseTime: 30000 // 30秒
  }
};

// 验证必要的配置
function validateConfig() {
  if (!config.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN 环境变量未设置');
  }
  
  if (config.telegram.allowedGroupIds.length === 0) {
    console.warn('警告: 未设置ALLOWED_GROUP_IDS，机器人将在所有群组中工作');
  }
}

module.exports = { config, validateConfig }; 