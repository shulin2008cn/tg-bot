# 技术规范文档

## 📋 项目信息

- **项目名称**: Telegram商品问询机器人
- **版本**: v1.0.0
- **技术栈**: Node.js + Telegraf + Express
- **开发语言**: JavaScript (ES6+)
- **运行环境**: Node.js >= 18.16.1

## 🔧 依赖包版本

### 核心依赖
```json
{
  "telegraf": "^4.15.7",
  "axios": "^1.6.7",
  "cheerio": "^1.0.0-rc.10",
  "dotenv": "^16.4.5",
  "jimp": "^0.22.12",
  "https-proxy-agent": "^7.0.2"
}
```

### 开发依赖
```json
{
  "nodemon": "^3.0.3"
}
```

## 📊 数据结构定义

### 商品信息对象 (Product)
```javascript
{
  title: String,        // 商品标题
  price: String,        // 商品价格 (格式: ¥99.00)
  image: String|null,   // 商品图片URL
  url: String,          // 商品链接
  platform: String,    // 商品平台 (淘宝/京东/1688等)
  description: String,  // 商品描述
  similarity?: Number   // 相似度 (0-1，图片识别时使用)
}
```

### 配置对象 (Config)
```javascript
{
  telegram: {
    botToken: String,           // 机器人Token
    allowedGroupIds: Number[]   // 允许的群组ID列表
  },
  server: {
    port: Number,              // 服务端口
    env: String               // 环境 (development/production)
  },
  proxy: {
    enabled: Boolean,         // 是否启用代理
    host: String,            // 代理主机
    port: String             // 代理端口
  },
  productApi: {
    key: String,             // 商品API密钥
    url: String              // 商品API地址
  },
  features: {
    enableImageProcessing: Boolean,  // 是否启用图片处理
    enableLinkProcessing: Boolean,   // 是否启用链接处理
    enableTextSearch: Boolean,       // 是否启用文本搜索
    maxImageSize: Number,           // 最大图片大小 (bytes)
    maxResponseTime: Number         // 最大响应时间 (ms)
  }
}
```

### Telegram消息上下文 (Context)
```javascript
{
  message: {
    text?: String,           // 文本内容
    photo?: Array,          // 图片数组
    document?: Object,      // 文档对象
    message_id: Number      // 消息ID
  },
  chat: {
    id: Number,             // 聊天ID
    type: String,           // 聊天类型 (private/group/supergroup)
    title?: String          // 群组标题
  },
  from: {
    id: Number,             // 用户ID
    username?: String,      // 用户名
    first_name: String      // 名字
  }
}
```

## 🔌 API接口规范

### 内部服务接口

#### ProductService API

##### `extractProductFromUrl(url: String): Promise<Product>`
从商品链接提取信息
```javascript
// 输入
url: "https://item.taobao.com/item.htm?id=123456"

// 输出
{
  title: "商品标题",
  price: "¥99.00",
  image: "https://img.example.com/product.jpg",
  url: "https://item.taobao.com/item.htm?id=123456",
  platform: "淘宝",
  description: "商品描述"
}
```

##### `searchProductByName(productName: String): Promise<Product[]>`
根据商品名称搜索
```javascript
// 输入
productName: "iPhone 15 Pro"

// 输出
[
  {
    title: "iPhone 15 Pro - 搜索结果",
    price: "¥8999",
    image: null,
    url: "https://example.com/product/1",
    platform: "示例平台",
    description: "商品描述"
  }
]
```

##### `recognizeProductFromImage(imageBuffer: Buffer): Promise<Product[]|null>`
图片商品识别
```javascript
// 输入
imageBuffer: Buffer // 图片二进制数据

// 输出
[
  {
    title: "识别的商品",
    price: "¥199",
    image: "https://img.example.com/recognized.jpg",
    url: "https://shop.example.com/item/456",
    platform: "识别平台",
    description: "识别描述",
    similarity: 0.95
  }
]
```

#### ImageService API

##### `downloadTelegramImage(bot: Telegraf, fileId: String): Promise<Buffer>`
下载Telegram图片
```javascript
// 输入
bot: Telegraf实例
fileId: "AgACAgIAAxkBAAIC..."

// 输出
Buffer // 图片二进制数据
```

##### `processImage(imageBuffer: Buffer, options?: Object): Promise<Buffer>`
处理图片
```javascript
// 输入
imageBuffer: Buffer
options: {
  maxWidth: 800,     // 最大宽度
  maxHeight: 600,    // 最大高度
  quality: 80        // 质量 (0-100)
}

// 输出
Buffer // 处理后的图片数据
```

##### `extractTextFromImage(imageBuffer: Buffer): Promise<String>`
OCR文字提取
```javascript
// 输入
imageBuffer: Buffer

// 输出
"提取的文字内容"
```

### 外部API接口

#### Telegram Bot API
基于Telegraf框架，支持标准Telegram Bot API

常用方法：
- `ctx.reply(text, options)` - 发送文本消息
- `ctx.replyWithPhoto(photo, options)` - 发送图片消息
- `ctx.telegram.getFile(fileId)` - 获取文件信息
- `ctx.telegram.deleteMessage(chatId, messageId)` - 删除消息

## 🛠️ 开发规范

### 代码风格
- 使用ES6+语法
- 异步操作使用async/await
- 错误处理使用try-catch
- 函数命名使用驼峰式
- 类名使用帕斯卡式

### 错误处理
```javascript
// 标准错误处理模式
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  logger.botError(error, { context: 'operation_name' });
  throw new Error(`操作失败: ${error.message}`);
}
```

### 日志记录
```javascript
// 信息日志
logger.info('操作成功', { data: result });

// 错误日志
logger.botError(error, { context: 'messageHandler' });

// 业务日志
logger.telegramMessage(chatId, messageType, content);
logger.productSearch(query, results);
```

### 配置管理
```javascript
// 获取配置
const { config } = require('./utils/config');

// 使用配置
const token = config.telegram.botToken;
const proxyEnabled = config.proxy.enabled;
```

## 🔐 环境变量

### 必需变量
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 可选变量
```env
# 群组权限控制
ALLOWED_GROUP_IDS=                  # 空值表示允许所有群组

# 代理配置
PROXY_ENABLED=true                  # 是否启用代理
PROXY_HOST=127.0.0.1               # 代理主机
PROXY_PORT=7890                    # 代理端口

# 服务器配置
PORT=3000                          # 服务端口
NODE_ENV=development               # 运行环境

# API配置
PRODUCT_API_KEY=your_api_key       # 商品API密钥
PRODUCT_API_URL=https://api.example.com  # 商品API地址
```

## 📋 消息类型处理

### 文本消息
```javascript
// 检测链接
if (message.match(/https?:\/\/[^\s]+/)) {
  // 处理链接
  await handleUrlMessage(ctx, url);
} else {
  // 处理商品搜索
  await handleProductSearch(ctx, message);
}
```

### 图片消息
```javascript
// 获取最大尺寸图片
const photos = ctx.message.photo;
const largestPhoto = photos[photos.length - 1];

// 下载并处理
const imageBuffer = await imageService.downloadTelegramImage(
  ctx.telegram, 
  largestPhoto.file_id
);
```

### 命令消息
```javascript
// 注册命令处理器
bot.command('start', handleStartCommand);
bot.command('help', handleHelpCommand);
bot.command('status', handleStatusCommand);
```

## 🔄 生命周期管理

### 启动流程
1. 加载环境变量
2. 验证配置
3. 初始化机器人实例
4. 设置消息处理器
5. 设置错误处理器
6. 启动机器人

### 关闭流程
1. 接收关闭信号 (SIGINT/SIGTERM)
2. 停止接收新消息
3. 处理完当前消息
4. 关闭机器人连接
5. 清理资源
6. 退出进程

## 📊 性能指标

### 响应时间目标
- 文本消息: < 1秒
- 链接解析: < 5秒
- 图片识别: < 10秒

### 资源限制
- 内存使用: < 256MB
- 图片大小: < 10MB
- 超时时间: 30秒

### 并发处理
- 支持多用户同时使用
- 异步消息处理
- 非阻塞I/O操作

## 🧪 测试策略

### 单元测试
- 工具函数测试
- 服务层测试
- 配置验证测试

### 集成测试
- Telegram API集成
- 外部服务集成
- 数据库集成 (如有)

### 端到端测试
- 完整消息流程测试
- 错误场景测试
- 性能压力测试

## 🚀 部署配置

### 开发环境
```bash
# 安装依赖
npm install

# 配置环境变量
cp env.example .env
# 编辑 .env 文件

# 启动开发服务
npm run dev
```

### 生产环境
```bash
# 设置生产环境变量
export NODE_ENV=production

# 启动服务
npm start

# 或使用进程管理器
pm2 start src/index.js --name telegram-bot
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 监控和告警

### 健康检查
- 机器人连接状态
- 内存使用情况
- 错误发生频率

### 日志监控
- 结构化日志输出
- 错误级别分类
- 关键业务指标记录

### 告警机制
- 服务异常告警
- 性能阈值告警
- 资源使用告警

---

*此技术规范文档与项目代码同步更新* 