require('dotenv').config();
const TelegramBot = require('../src/bot/bot');
const { config } = require('../src/utils/config');
const logger = require('../src/utils/logger');

async function testPushService() {
  console.log('🚀 测试推送服务...');
  
  let bot = null;
  
  try {
    // 创建并启动机器人
    bot = new TelegramBot();
    await bot.start();
    
    console.log('✅ 机器人启动成功');
    console.log('⏱️  等待5秒后开始测试...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 获取推送服务状态
    const pushStatus = bot.pushService.getStatus();
    console.log('📊 推送服务状态:', pushStatus);
    
    // 模拟添加一个测试订阅者（使用当前用户ID）
    const testChatId = 123456789; // 替换为实际的聊天ID进行测试
    const testUserId = 987654321; // 替换为实际的用户ID进行测试
    
    console.log(`🧪 模拟添加测试订阅者: ${testChatId}`);
    
    // 添加测试订阅者
    // await bot.pushService.addSubscriber(testChatId, testUserId);
    
    // 测试发送单条推送消息
    const testProduct = {
      title: '测试商品 - iPhone 15 Pro',
      price: '¥8999',
      image: null,
      url: 'https://example.com/test-product',
      platform: '测试平台',
      description: '这是一个测试商品，用于验证推送功能是否正常工作。'
    };
    
    console.log('📤 测试商品推送...');
    
    // 如果有订阅者，发送测试推送
    const subscribers = bot.pushService.getActiveSubscribers();
    if (subscribers.length > 0) {
      console.log(`📬 发现 ${subscribers.length} 个活跃订阅者`);
      
      // 发送测试推送到第一个订阅者
      const testSubscriber = subscribers[0];
      try {
        await bot.pushService.sendProductPush(testSubscriber.chatId, testProduct);
        console.log(`✅ 成功发送测试推送到: ${testSubscriber.chatId}`);
      } catch (error) {
        console.log(`❌ 发送测试推送失败: ${error.message}`);
      }
    } else {
      console.log('⚠️  没有找到活跃订阅者，跳过推送测试');
    }
    
    // 测试广播功能
    console.log('📢 测试广播功能...');
    
    const broadcastMessage = `🎉 <b>系统测试消息</b>

这是一条测试广播消息，用于验证推送系统是否正常工作。

⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}
🤖 发送方: 推送测试脚本`;

    try {
      const result = await bot.pushService.broadcastMessage(broadcastMessage, {
        batchSize: 10,
        delay: 500
      });
      
      console.log('📊 广播结果:', result);
      
    } catch (error) {
      console.log(`❌ 广播测试失败: ${error.message}`);
    }
    
    // 测试每日推荐功能
    console.log('📦 测试每日推荐功能...');
    
    try {
      await bot.pushService.sendDailyRecommendation();
      console.log('✅ 每日推荐测试完成');
    } catch (error) {
      console.log(`❌ 每日推荐测试失败: ${error.message}`);
    }
    
    // 显示最终状态
    const finalStatus = bot.pushService.getStatus();
    console.log('📈 最终推送服务状态:', finalStatus);
    
    console.log('✅ 推送服务测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 清理资源
    if (bot) {
      console.log('🧹 正在清理资源...');
      await bot.stop();
    }
    
    console.log('👋 测试结束');
    process.exit(0);
  }
}

// 主函数
async function main() {
  console.log('🧪 Telegram机器人推送服务测试');
  console.log('=====================================');
  
  // 检查配置
  if (!config.telegram.botToken) {
    console.error('❌ 错误: 未设置 TELEGRAM_BOT_TOKEN');
    process.exit(1);
  }
  
  console.log('🔧 配置检查通过');
  console.log(`📡 机器人Token: ${config.telegram.botToken.substring(0, 10)}...`);
  console.log(`🌐 代理状态: ${config.proxy.enabled ? '启用' : '禁用'}`);
  
  // 开始测试
  await testPushService();
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 收到退出信号，正在停止测试...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，正在停止测试...');
  process.exit(0);
});

// 启动测试
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 测试启动失败:', error);
    process.exit(1);
  });
}

module.exports = { testPushService }; 