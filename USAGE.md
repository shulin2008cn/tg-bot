# Telegram 商品问询机器人 - 使用指南

## 🚀 快速开始

### 第一步：创建Telegram机器人

1. **找到BotFather**
   - 在Telegram中搜索 `@BotFather`
   - 开始对话

2. **创建新机器人**
   ```
   发送: /newbot
   按提示设置机器人名称（如：商品助手）
   设置用户名（必须以bot结尾，如：myproduct_bot）
   ```

3. **获取Token**
   - BotFather会给你一个Token，类似：`1234567890:ABCdefGhIJKlmnoPQRsTuVwXYz`
   - **保存好这个Token！**

### 第二步：配置项目

1. **编辑环境配置**
   ```bash
   # 编辑 .env 文件
   nano .env
   
   # 或者用其他编辑器
   code .env
   ```

2. **填入必要配置**
   ```env
   # 必填：你的机器人Token
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmnoPQRsTuVwXYz
   
   # 可选：限制机器人只在特定群组工作
   ALLOWED_GROUP_IDS=-1001234567890,-1001234567891
   
   # 其他配置保持默认即可
   PORT=3000
   NODE_ENV=development
   ```

### 第三步：启动机器人

1. **开发模式（推荐）**
   ```bash
   npm run dev
   ```

2. **生产模式**
   ```bash
   npm start
   ```

3. **看到成功提示**
   ```
   ✅ Telegram机器人启动成功
   机器人用户名: @your_bot_username
   ```

## 🤖 机器人功能

### 支持的问询方式

1. **📸 发送商品图片**
   - 直接发送商品图片
   - 机器人会识别并推荐相似商品
   - 支持JPG、PNG、WebP格式

2. **🔗 发送商品链接**
   - 支持淘宝、天猫、京东、1688等主流平台
   - 自动解析商品标题、价格、图片
   - 生成美观的商品卡片

3. **💬 发送商品名称**
   - 直接输入商品名称搜索
   - 如："iPhone 15 Pro"、"Nike运动鞋"
   - 返回相关商品推荐

### 机器人命令

- `/start` - 开始使用机器人
- `/help` - 查看详细帮助
- `/status` - 查看机器人运行状态

## 📱 使用场景

### 在群组中使用

1. **添加机器人到群组**
   - 邀请你的机器人进入群组
   - 机器人会自动发送欢迎消息

2. **群组成员交互**
   - 任何成员都可以发送商品图片或链接
   - 机器人会自动回复商品信息
   - 支持多人同时使用

3. **权限控制（可选）**
   - 在`.env`文件中设置`ALLOWED_GROUP_IDS`
   - 限制机器人只在指定群组工作

### 私聊使用

- 直接与机器人私聊
- 所有功能都可以在私聊中使用
- 更加私密和个人化

## 🔧 高级配置

### 自定义商品识别

1. **接入真实API**
   ```javascript
   // 在 src/services/productService.js 中
   // 替换模拟数据为真实的商品API调用
   ```

2. **支持的API平台**
   - 淘宝客API
   - 京东联盟API
   - 拼多多推广API
   - 其他电商开放平台

### 图片识别优化

1. **接入OCR服务**
   ```javascript
   // 在 src/services/imageService.js 中
   // 接入百度OCR、腾讯OCR等服务
   ```

2. **商品识别API**
   - 百度图像识别
   - 腾讯优图
   - 阿里云视觉AI

## 🐛 常见问题

### 1. 机器人无响应

**检查Token**
```bash
# 确认Token正确设置
cat .env | grep TELEGRAM_BOT_TOKEN
```

**检查网络**
```bash
# 测试Telegram API连接
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

### 2. 图片识别失败

- 检查图片大小（默认限制10MB）
- 确认图片格式（支持JPG/PNG/WebP）
- 检查网络连接

### 3. 商品链接解析失败

- 确认链接来自支持的平台
- 检查网络访问权限
- 可能遇到反爬虫限制

### 4. 群组权限问题

```env
# 获取群组ID的方法：
# 1. 添加机器人到群组
# 2. 查看日志中的群组ID
# 3. 将ID添加到ALLOWED_GROUP_IDS
```

## 📊 监控和日志

### 查看运行日志

```bash
# 开发模式下直接查看控制台输出
npm run dev

# 生产模式下可以重定向日志
npm start > bot.log 2>&1
```

### 日志内容包括

- 机器人启动信息
- 用户消息处理记录
- 商品搜索结果
- 错误和异常信息

## 🔄 更新和维护

### 更新依赖

```bash
# 检查过时的依赖
npm outdated

# 更新依赖
npm update
```

### 备份配置

```bash
# 备份重要配置文件
cp .env .env.backup
```

### 重启机器人

```bash
# 停止机器人 (Ctrl+C)
# 然后重新启动
npm run dev
```

## 🤝 获得帮助

如果遇到问题，可以：

1. 查看控制台错误信息
2. 检查`.env`配置文件
3. 运行`npm run validate`验证代码
4. 查看Telegram Bot API文档

## 🎯 扩展功能

项目已预留扩展接口，你可以：

- 添加更多电商平台支持
- 接入更强大的AI识别服务
- 添加用户行为分析
- 实现商品价格追踪
- 集成支付功能

祝您使用愉快！🎉 