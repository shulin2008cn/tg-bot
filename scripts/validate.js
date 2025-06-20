const fs = require('fs');
const path = require('path');

// 验证项目代码的脚本
async function validate() {
  console.log('🔍 正在验证项目代码...\n');

  try {
    // 设置测试环境变量
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.NODE_ENV = 'development';
    
    console.log('✅ 正在检查配置模块...');
    const { config } = require('../src/utils/config');
    console.log('   - 配置模块加载成功');

    console.log('✅ 正在检查日志模块...');
    const logger = require('../src/utils/logger');
    logger.info('日志模块测试');
    console.log('   - 日志模块工作正常');

    console.log('✅ 正在检查服务模块...');
    const productService = require('../src/services/productService');
    const imageService = require('../src/services/imageService');
    console.log('   - 商品服务模块加载成功');
    console.log('   - 图片服务模块加载成功');

    console.log('✅ 正在检查消息处理器...');
    const messageHandler = require('../src/bot/handlers/messageHandler');
    console.log('   - 消息处理器加载成功');

    console.log('✅ 正在检查机器人核心模块...');
    // 这里不实际创建bot实例，因为没有有效的token
    const TelegramBot = require('../src/bot/bot');
    console.log('   - 机器人模块加载成功');

    console.log('✅ 正在检查入口模块...');
    const { main } = require('../src/index');
    console.log('   - 入口模块加载成功');

    console.log('\n🎉 所有模块验证通过！');
    console.log('\n📋 项目已就绪，可以开始使用：');
    console.log('1. 编辑 .env 文件，设置真实的 TELEGRAM_BOT_TOKEN');
    console.log('2. 运行 npm run dev 启动开发模式');
    console.log('3. 在Telegram中测试机器人功能');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error('\n错误详情:');
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  validate();
}

module.exports = { validate }; 