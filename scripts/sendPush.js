#!/usr/bin/env node

const path = require('path');
const { config } = require('../src/utils/config');
const TelegramBot = require('../src/bot/bot');

async function sendTestPush() {
  console.log('🚀 开始发送测试推送消息...');
  
  try {
    // 创建机器人实例
    const bot = new TelegramBot();
    
    // 初始化推送服务
    await bot.pushService.init();
    
    // 获取推送服务
    const pushService = bot.pushService;
    
    if (!pushService) {
      console.error('❌ 推送服务未初始化');
      return;
    }
    
    // 测试消息内容
    const testMessage = `🎉 <b>测试推送消息</b>

📦 这是一条来自机器人的测试推送消息！

⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}
🤖 机器人状态: 正常运行

💡 如果您收到这条消息，说明推送功能工作正常！

使用 /push_settings 可以管理您的推送偏好`;

    // 发送广播消息
    console.log('📤 正在发送推送消息...');
    const result = await pushService.broadcastMessage(testMessage, {
      options: { parse_mode: 'HTML' }
    });
    
    console.log('✅ 推送发送完成！');
    console.log('📊 发送统计:');
    console.log(`   - 总计: ${result.totalCount} 个订阅者`);
    console.log(`   - 成功: ${result.successCount} 条`);
    console.log(`   - 失败: ${result.failureCount} 条`);
    
    if (result.successCount > 0) {
      console.log('🎯 推送消息已成功发送给所有活跃订阅者！');
    }
    
  } catch (error) {
    console.error('❌ 推送发送失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  sendTestPush().then(() => {
    console.log('👋 推送脚本执行完成');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { sendTestPush }; 