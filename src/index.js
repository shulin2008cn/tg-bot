const { validateConfig } = require('./utils/config');
const logger = require('./utils/logger');
const TelegramBot = require('./bot/bot');

// 主函数
async function main() {
  try {
    // 验证配置
    validateConfig();
    logger.info('配置验证通过');

    // 创建并启动机器人
    const bot = new TelegramBot();
    await bot.start();

    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      logger.info(`收到 ${signal} 信号，正在优雅关闭...`);
      
      try {
        await bot.stop();
        logger.info('机器人已安全关闭');
        process.exit(0);
      } catch (error) {
        logger.error('关闭机器人时出错', { error });
        process.exit(1);
      }
    };

    // 注册信号处理器
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 保持进程运行
    logger.info('🚀 Telegram商品问询机器人已启动');
    logger.info('按 Ctrl+C 停止机器人');

  } catch (error) {
    logger.error('启动机器人失败', { error: error.stack });
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main }; 