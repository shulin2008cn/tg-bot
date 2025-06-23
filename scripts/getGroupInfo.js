#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { config } = require('../src/utils/config');

// 群组信息存储文件
const GROUP_INFO_FILE = path.join(__dirname, '../data/groups.json');

// 确保数据目录存在
const dataDir = path.dirname(GROUP_INFO_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class GroupInfoCollector {
  constructor() {
    this.groups = this.loadGroups();
  }

  // 加载已保存的群组信息
  loadGroups() {
    try {
      if (fs.existsSync(GROUP_INFO_FILE)) {
        const data = fs.readFileSync(GROUP_INFO_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('加载群组信息失败:', error.message);
    }
    return {};
  }

  // 保存群组信息
  saveGroups() {
    try {
      fs.writeFileSync(GROUP_INFO_FILE, JSON.stringify(this.groups, null, 2));
      console.log(`✅ 群组信息已保存到: ${GROUP_INFO_FILE}`);
    } catch (error) {
      console.error('保存群组信息失败:', error);
    }
  }

  // 记录群组信息
  recordGroup(ctx) {
    const chat = ctx.chat;
    
    if (chat.type === 'group' || chat.type === 'supergroup') {
      const groupInfo = {
        id: chat.id,
        title: chat.title,
        type: chat.type,
        memberCount: chat.all_members_are_administrators ? '未知' : '未知',
        username: chat.username || null,
        description: chat.description || null,
        lastSeen: new Date().toISOString(),
        botStatus: 'active'
      };

      this.groups[chat.id] = groupInfo;
      this.saveGroups();
      
      console.log(`📝 记录群组信息: ${chat.title} (${chat.id})`);
    }
  }

  // 显示所有群组信息
  displayGroups() {
    const groupList = Object.values(this.groups);
    
    if (groupList.length === 0) {
      console.log('📭 暂无群组信息记录');
      console.log('\n💡 提示: 让机器人加入群组并发送消息后，群组信息会自动记录');
      return;
    }

    console.log(`📋 发现 ${groupList.length} 个群组:\n`);
    
    groupList.forEach((group, index) => {
      console.log(`${index + 1}. 📢 ${group.title}`);
      console.log(`   🆔 ID: ${group.id}`);
      console.log(`   🏷️  类型: ${group.type}`);
      if (group.username) {
        console.log(`   🔗 用户名: @${group.username}`);
      }
      if (group.description) {
        console.log(`   📝 描述: ${group.description.substring(0, 50)}${group.description.length > 50 ? '...' : ''}`);
      }
      console.log(`   ⏰ 最后活跃: ${new Date(group.lastSeen).toLocaleString('zh-CN')}`);
      console.log(`   🤖 状态: ${group.botStatus}`);
      console.log('');
    });

    // 生成可用于广播的群组ID列表
    const groupIds = groupList.map(g => g.id);
    console.log('📋 可用于广播的群组ID列表:');
    console.log('const TARGET_GROUPS = [');
    groupIds.forEach(id => {
      const group = this.groups[id];
      console.log(`  ${id}, // ${group.title}`);
    });
    console.log('];');
  }

  // 测试群组连接
  async testGroupConnections() {
    const TelegramBot = require('../src/bot/bot');
    const bot = new TelegramBot();
    
    const groupList = Object.values(this.groups);
    
    if (groupList.length === 0) {
      console.log('❌ 没有群组信息可测试');
      return;
    }

    console.log(`🧪 测试 ${groupList.length} 个群组的连接状态...\n`);
    
    for (const group of groupList) {
      try {
        console.log(`📡 测试群组: ${group.title} (${group.id})`);
        
        // 尝试获取群组信息
        const chatInfo = await bot.bot.telegram.getChat(group.id);
        
        // 更新群组信息
        this.groups[group.id] = {
          ...group,
          title: chatInfo.title,
          memberCount: chatInfo.members_count || '未知',
          lastTested: new Date().toISOString(),
          botStatus: 'connected'
        };
        
        console.log(`   ✅ 连接正常 - 成员数: ${chatInfo.members_count || '未知'}`);
        
      } catch (error) {
        console.log(`   ❌ 连接失败: ${error.message}`);
        
        // 更新状态
        this.groups[group.id] = {
          ...group,
          lastTested: new Date().toISOString(),
          botStatus: 'error',
          lastError: error.message
        };
      }
      
      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.saveGroups();
    console.log('\n🎯 群组连接测试完成！');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const collector = new GroupInfoCollector();
  
  const command = process.argv[2] || 'list';
  
  switch (command) {
    case 'list':
    case 'show':
      collector.displayGroups();
      break;
      
    case 'test':
      collector.testGroupConnections().then(() => {
        console.log('测试完成');
        process.exit(0);
      }).catch(error => {
        console.error('测试失败:', error);
        process.exit(1);
      });
      break;
      
    case 'help':
    default:
      console.log(`
📋 群组信息工具使用说明:

命令:
  npm run groups          # 显示所有群组信息
  npm run groups list     # 显示所有群组信息 (同上)
  npm run groups test     # 测试群组连接状态
  npm run groups help     # 显示帮助信息

功能说明:
1. 自动记录机器人加入的群组信息
2. 显示群组ID、名称、类型等详细信息
3. 生成可用于广播的群组ID列表
4. 测试群组连接状态

注意事项:
- 群组信息会自动保存到 data/groups.json
- 只有机器人收到消息的群组才会被记录
- 使用群组ID进行广播时，确保机器人有发送消息权限
`);
      break;
  }
}

module.exports = GroupInfoCollector; 