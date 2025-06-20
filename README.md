# Telegram 商品问询机器人

一个用于在Telegram群组中响应用户商品问询的机器人。

## 功能特性

- 🔍 支持多种问询方式：图片、商品链接、商品名称
- 📱 智能商品信息提取
- 🎨 美观的商品卡片回复
- 👥 群组消息处理
- 🛡️ 群组权限控制

## 快速开始

### 1. 创建Telegram机器人

1. 在Telegram中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. 获取Bot Token

### 2. 配置环境

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，填入你的Bot Token
```

### 3. 安装依赖

```bash
npm install
```

### 4. 运行机器人

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 配置说明

在 `.env` 文件中配置以下参数：

- `TELEGRAM_BOT_TOKEN`: 你的Telegram机器人Token
- `ALLOWED_GROUP_IDS`: 允许机器人工作的群组ID列表

## 使用说明

1. 将机器人添加到群组
2. 在群组中发送商品相关消息：
   - 发送商品图片
   - 发送商品链接
   - 发送商品名称
3. 机器人会自动回复商品卡片信息

## 项目结构

```
telegram-bot/
├── src/
│   ├── index.js          # 入口文件
│   ├── bot/
│   │   ├── bot.js        # 机器人核心逻辑
│   │   └── handlers/     # 消息处理器
│   ├── services/
│   │   ├── productService.js  # 商品信息服务
│   │   └── imageService.js    # 图片处理服务
│   └── utils/
│       ├── config.js     # 配置管理
│       └── logger.js     # 日志工具
├── package.json
└── README.md
``` 