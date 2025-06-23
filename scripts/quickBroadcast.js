#!/usr/bin/env node

const { broadcastToGroups } = require('./broadcastToGroups');

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
📢 快速广播工具使用说明:

用法:
  node scripts/quickBroadcast.js <群组ID> "<消息内容>"

示例:
  node scripts/quickBroadcast.js -1002851409233 "Hello World!"
  node scripts/quickBroadcast.js -1001234567890 "<b>重要通知</b>\\n\\n系统维护中..."

多个群组:
  node scripts/quickBroadcast.js "-1001111111111,-1002222222222" "群发消息"

注意事项:
1. 群组ID必须是负数
2. 消息内容支持HTML格式
3. 多个群组ID用逗号分隔，整体用引号包围
4. 确保机器人在目标群组中且有发送消息权限
`);
    process.exit(1);
  }
  
  const groupIdsStr = args[0];
  const message = args.slice(1).join(' ');
  
  // 解析群组ID
  let groupIds;
  try {
    if (groupIdsStr.includes(',')) {
      // 多个群组ID
      groupIds = groupIdsStr.split(',').map(id => parseInt(id.trim()));
    } else {
      // 单个群组ID
      groupIds = [parseInt(groupIdsStr)];
    }
    
    // 验证群组ID格式
    for (const id of groupIds) {
      if (isNaN(id) || id >= 0) {
        console.error(`❌ 无效的群组ID: ${id}`);
        console.error('群组ID必须是负数，例如: -1002851409233');
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ 解析群组ID失败:', error.message);
    process.exit(1);
  }
  
  console.log('📢 快速广播工具');
  console.log('=' .repeat(30));
  console.log('🎯 目标群组:', groupIds);
  console.log('📝 消息内容:');
  console.log(message);
  console.log('=' .repeat(30));
  
  broadcastToGroups(message, groupIds).then((result) => {
    console.log('\n🎯 广播任务完成！');
    
    if (result.successCount > 0) {
      console.log(`✨ 成功发送到 ${result.successCount} 个群组`);
    }
    
    if (result.failureCount > 0) {
      console.log(`⚠️  ${result.failureCount} 个群组发送失败`);
    }
    
    process.exit(result.successCount > 0 ? 0 : 1);
  }).catch((error) => {
    console.error('💥 广播任务失败:', error);
    process.exit(1);
  });
} 