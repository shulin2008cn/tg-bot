const fs = require('fs');
const path = require('path');

// 设置项目的初始化脚本
function setup() {
  console.log('🚀 正在设置Telegram商品问询机器人...\n');

  // 检查并创建 .env 文件
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env 文件已创建，请编辑其中的配置');
    } else {
      console.log('❌ 未找到 env.example 文件');
    }
  } else {
    console.log('✅ .env 文件已存在');
  }

  // 检查必要的目录结构
  const directories = [
    'src',
    'src/bot',
    'src/bot/handlers',
    'src/services',
    'src/utils'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ 创建目录: ${dir}`);
    }
  });

  console.log('\n📋 下一步操作：');
  console.log('1. 编辑 .env 文件，设置你的 TELEGRAM_BOT_TOKEN');
  console.log('2. 运行 npm install 安装依赖');
  console.log('3. 运行 npm run dev 启动开发模式');
  console.log('4. 或运行 npm start 启动生产模式');
  
  console.log('\n🤖 如何获取Telegram Bot Token：');
  console.log('1. 在Telegram中搜索 @BotFather');
  console.log('2. 发送 /newbot 命令');
  console.log('3. 按提示设置机器人名称和用户名');
  console.log('4. 复制获得的Token到 .env 文件中');
  
  console.log('\n🎉 设置完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  setup();
}

module.exports = { setup }; 