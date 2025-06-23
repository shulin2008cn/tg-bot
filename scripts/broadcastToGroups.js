#!/usr/bin/env node

const { config } = require('../src/utils/config');
const TelegramBot = require('../src/bot/bot');

// 预定义的群组列表（可以根据需要修改）
const TARGET_GROUPS = [
  // 示例群组ID，请替换为实际的群组ID
  -1002851409233, // 您的测试群组
  // -1001234567890, // 其他群组
  // -1009876543210, // 更多群组
];

async function broadcastToGroups(message, groupIds = null) {
  console.log('🚀 开始向群组广播消息...');
  
  try {
    // 创建机器人实例
    const bot = new TelegramBot();
    
    // 确定目标群组
    const targetGroups = groupIds || TARGET_GROUPS;
    
    if (targetGroups.length === 0) {
      console.error('❌ 没有指定目标群组');
      return;
    }
    
    console.log(`📤 准备向 ${targetGroups.length} 个群组发送消息`);
    console.log('目标群组:', targetGroups);
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    // 逐个发送消息
    for (const groupId of targetGroups) {
      try {
        console.log(`📨 正在向群组 ${groupId} 发送消息...`);
        
        const result = await bot.sendMessage(groupId, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        
        successCount++;
        results.push({
          groupId,
          success: true,
          messageId: result.message_id
        });
        
        console.log(`✅ 群组 ${groupId} 发送成功 (消息ID: ${result.message_id})`);
        
        // 发送间隔，避免触发限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failureCount++;
        results.push({
          groupId,
          success: false,
          error: error.message
        });
        
        console.error(`❌ 群组 ${groupId} 发送失败:`, error.message);
        
        // 如果是权限问题，记录详细信息
        if (error.message.includes('chat not found') || 
            error.message.includes('bot was blocked') ||
            error.message.includes('not enough rights')) {
          console.warn(`⚠️  群组 ${groupId} 可能需要检查机器人权限或群组状态`);
        }
      }
    }
    
    console.log('\n📊 广播完成统计:');
    console.log(`✅ 成功: ${successCount} 个群组`);
    console.log(`❌ 失败: ${failureCount} 个群组`);
    console.log(`📝 总计: ${targetGroups.length} 个群组`);
    
    // 显示详细结果
    if (results.length > 0) {
      console.log('\n📋 详细结果:');
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.groupId}: 成功 (消息ID: ${result.messageId})`);
        } else {
          console.log(`  ❌ ${result.groupId}: ${result.error}`);
        }
      });
    }
    
    return {
      successCount,
      failureCount,
      totalCount: targetGroups.length,
      results
    };
    
  } catch (error) {
    console.error('💥 广播过程中发生错误:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 从命令行参数获取消息内容
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📢 群组广播脚本使用说明:

基本用法:
  npm run broadcast "消息内容"

示例:
  npm run broadcast "🎉 欢迎使用商品问询机器人！"
  npm run broadcast "📦 新功能上线通知"

支持HTML格式:
  npm run broadcast "<b>重要通知</b>\\n\\n📅 系统维护时间: 今晚8点"

注意事项:
1. 消息内容需要用引号包围
2. 支持HTML格式标签 (<b>, <i>, <code> 等)
3. 使用 \\n 表示换行
4. 确保机器人已被添加到目标群组且有发送消息权限
`);
    process.exit(1);
  }
  
  const message = args.join(' ');
  
  console.log('📢 群组广播脚本');
  console.log('=' .repeat(30));
  console.log('📝 消息内容:');
  console.log(message);
  console.log('=' .repeat(30));
  
  broadcastToGroups(message).then((result) => {
    console.log('\n🎯 广播任务完成！');
    
    if (result.successCount > 0) {
      console.log('✨ 消息已成功发送到部分或全部群组');
    } else {
      console.log('⚠️  没有成功发送到任何群组，请检查群组权限');
    }
    
    process.exit(0);
  }).catch((error) => {
    console.error('💥 广播任务失败:', error);
    process.exit(1);
  });
}

module.exports = { broadcastToGroups, TARGET_GROUPS }; 