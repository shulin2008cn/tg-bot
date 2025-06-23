# Telegram 商品问询机器人 - 项目架构

## 📋 项目概述

这是一个基于Node.js开发的Telegram机器人，专门用于处理商品问询请求。支持图片识别、链接解析和文本搜索等多种问询方式。

## 🏗️ 架构设计

### 分层架构
```
┌─────────────────────────────────────────┐
│              入口层 (Entry)              │
├─────────────────────────────────────────┤
│             核心层 (Core)               │
├─────────────────────────────────────────┤
│            处理层 (Handler)             │
├─────────────────────────────────────────┤
│            服务层 (Service)             │
├─────────────────────────────────────────┤
│            工具层 (Utils)               │
└─────────────────────────────────────────┘
```

## 📁 目录结构

```
telegram-bot/
├── src/                    # 源代码目录
│   ├── index.js           # 🚪 项目入口点
│   ├── bot/               # 🤖 机器人核心模块
│   │   ├── bot.js         # 机器人主类，初始化和配置
│   │   └── handlers/      # 消息处理器
│   │       └── messageHandler.js  # 处理各类Telegram消息
│   ├── services/          # 🔧 业务服务层
│   │   ├── productService.js     # 商品信息处理服务
│   │   └── imageService.js       # 图片处理服务
│   └── utils/             # 🛠️ 工具模块
│       ├── config.js      # 配置管理
│       └── logger.js      # 日志系统
├── scripts/               # 📜 工具脚本
│   ├── setup.js          # 项目初始化脚本
│   └── validate.js       # 代码验证脚本
├── docs/                  # 📚 文档文件
│   ├── README.md         # 项目说明
│   ├── USAGE.md          # 使用指南
│   └── ARCHITECTURE.md   # 架构文档(本文件)
└── config/               # ⚙️ 配置文件
    ├── .env              # 环境变量
    ├── env.example       # 环境变量示例
    └── package.json      # 项目依赖配置
```

## 🔧 核心模块详解

### 1. 入口层 (Entry Layer)

#### `src/index.js`
- **作用**: 应用程序主入口
- **职责**: 
  - 验证配置
  - 启动机器人实例
  - 处理优雅关闭
  - 错误处理和进程管理

### 2. 核心层 (Core Layer)

#### `src/bot/bot.js`
- **作用**: Telegram机器人核心控制器
- **职责**:
  - 初始化Telegraf实例
  - 配置代理连接
  - 设置消息路由
  - 管理机器人生命周期
  - 处理内联查询和回调

**主要功能**:
```javascript
- setupHandlers()      // 设置消息处理器
- setupErrorHandlers() // 设置错误处理
- start()             // 启动机器人
- stop()              // 停止机器人
- setupBotCommands()  // 设置机器人命令
```

### 3. 处理层 (Handler Layer)

#### `src/bot/handlers/messageHandler.js`
- **作用**: 消息处理逻辑中心
- **职责**:
  - 处理不同类型的Telegram消息
  - 权限验证和群组管理
  - 调用相应的服务处理请求
  - 格式化和发送响应

**消息类型支持**:
- 📝 文本消息 (商品名称/链接)
- 📸 图片消息 (商品图片)
- 📄 文档消息 (图片文档)
- ⌨️ 命令消息 (/start, /help, /status)

**核心方法**:
```javascript
- handleTextMessage()    // 处理文本消息
- handlePhotoMessage()   // 处理图片消息
- handleUrlMessage()     // 处理链接消息
- handleProductSearch()  // 处理商品搜索
- sendProductCard()      // 发送商品卡片
- isAllowedGroup()       // 群组权限检查
```

### 4. 服务层 (Service Layer)

#### `src/services/productService.js`
- **作用**: 商品信息处理服务
- **职责**:
  - 解析商品链接 (淘宝/京东/1688等)
  - 搜索商品信息
  - 网页内容爬取和解析
  - 图片商品识别接口

**支持平台**:
- 🛒 淘宝/天猫
- 📱 京东
- 🏭 1688
- 🌍 亚马逊
- 🛍️ 速卖通

**核心功能**:
```javascript
- extractProductFromUrl()      // 从URL提取商品信息
- searchProductByName()        // 按名称搜索商品
- recognizeProductFromImage()  // 图片商品识别
- extractFromTaobao()         // 淘宝专用解析
- extractFromJD()             // 京东专用解析
```

#### `src/services/imageService.js`
- **作用**: 图片处理服务
- **职责**:
  - 下载Telegram图片
  - 图片压缩和优化
  - OCR文字识别
  - 图片商品识别

**技术栈**:
- 📸 Jimp (图片处理)
- 🔍 OCR API接口 (可扩展)
- 🤖 AI图像识别 (可扩展)

**核心功能**:
```javascript
- downloadTelegramImage()  // 下载Telegram图片
- processImage()          // 图片处理和压缩
- extractTextFromImage()  // OCR文字提取
- recognizeProduct()      // 商品识别
- createThumbnail()       // 创建缩略图
```

### 5. 工具层 (Utils Layer)

#### `src/utils/config.js`
- **作用**: 配置管理中心
- **职责**:
  - 环境变量加载和验证
  - 配置项统一管理
  - 配置验证和默认值

**配置分类**:
```javascript
- telegram: { botToken, allowedGroupIds }
- server: { port, env }
- proxy: { enabled, host, port }
- productApi: { key, url }
- features: { enableImageProcessing, ... }
```

#### `src/utils/logger.js`
- **作用**: 日志系统
- **职责**:
  - 统一日志格式
  - 不同级别日志记录
  - 开发/生产环境区分
  - 特定业务日志方法

**日志级别**:
- 📊 `info` - 一般信息
- ⚠️ `warn` - 警告信息  
- ❌ `error` - 错误信息
- 🔍 `debug` - 调试信息

## 🔄 数据流向

### 消息处理流程
```
Telegram用户
    ↓ 发送消息
Telegram API
    ↓ webhook/polling
bot.js (消息路由)
    ↓ 根据消息类型
messageHandler.js
    ↓ 调用相应服务
productService.js / imageService.js
    ↓ 处理业务逻辑
返回结果
    ↓ 格式化响应
messageHandler.js
    ↓ 发送商品卡片
Telegram API
    ↓ 推送消息
Telegram用户
```

### 权限验证流程
```
收到消息
    ↓
提取chatId
    ↓
是否私聊? → [是] → 允许访问
    ↓ [否]
检查群组白名单
    ↓
白名单为空? → [是] → 允许所有群组
    ↓ [否]
chatId在白名单? → [是] → 允许访问
    ↓ [否]
拒绝访问 (记录警告日志)
```

## 🔌 外部依赖和集成

### Telegram相关
- **Telegraf**: Telegram Bot API框架
- **https-proxy-agent**: 代理支持

### 网络请求
- **axios**: HTTP客户端
- **cheerio**: HTML解析器

### 图片处理
- **jimp**: 图片处理库

### 开发工具
- **nodemon**: 开发时热重载
- **dotenv**: 环境变量管理

## 🔒 安全特性

### 1. 代理支持
- 支持HTTP/HTTPS代理
- 配置灵活，可开启/关闭
- 默认端口7890 (Clash)

### 2. 权限控制
- 私聊无限制使用
- 群组白名单机制
- 可配置允许所有群组

### 3. 错误处理
- 全局异常捕获
- 优雅降级处理
- 详细错误日志

### 4. 数据验证
- 输入参数验证
- 文件大小限制
- 超时时间控制

## 🚀 扩展性设计

### 1. 服务接口预留
- 商品API接口可替换
- OCR服务可扩展
- 图像识别AI可集成

### 2. 插件化架构
- 消息处理器可扩展
- 新的商品平台支持
- 自定义命令添加

### 3. 配置驱动
- 功能开关控制
- 动态配置加载
- 环境适配

## 📊 性能优化

### 1. 异步处理
- 全异步消息处理
- 并发请求支持
- 非阻塞I/O操作

### 2. 资源管理
- 图片大小限制
- 内存使用监控
- 连接池管理

### 3. 缓存策略
- 商品信息缓存 (可扩展)
- 图片处理结果缓存 (可扩展)

## 🔧 部署和维护

### 开发环境
```bash
npm run dev     # 开发模式 (nodemon热重载)
npm run validate # 代码验证
npm run setup   # 初始化项目
```

### 生产环境
```bash
npm start       # 生产模式
npm run status  # 检查状态
```

### 监控指标
- 机器人响应时间
- 消息处理成功率
- 错误发生频率
- 内存和CPU使用率

## 📈 未来规划

### 短期目标
- [ ] 接入真实商品API
- [ ] 添加更多电商平台支持
- [ ] 优化图片识别准确率

### 中期目标
- [ ] 添加用户行为分析
- [ ] 实现商品价格追踪
- [ ] 支持商品推荐算法

### 长期目标
- [ ] 多语言支持
- [ ] 商品比价功能
- [ ] 集成支付系统

---

## 📝 更新日志

- **v1.0.0** (2025-06-19): 初始版本发布
  - 基础消息处理功能
  - 商品链接解析
  - 图片识别框架
  - 代理支持和权限控制

---

*此文档会随着项目发展持续更新* 