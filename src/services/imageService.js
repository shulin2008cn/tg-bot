const axios = require('axios');
const Jimp = require('jimp');
const logger = require('../utils/logger');
const { config } = require('../utils/config');

class ImageService {
  constructor() {
    this.maxSize = config.features.maxImageSize;
  }

  // 下载Telegram图片
  async downloadTelegramImage(bot, fileId) {
    try {
      logger.info(`开始下载Telegram图片: ${fileId}`);
      
      // 获取文件信息
      const file = await bot.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${file.file_path}`;
      
      // 下载图片
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const imageBuffer = Buffer.from(response.data);
      
      // 检查文件大小
      if (imageBuffer.length > this.maxSize) {
        throw new Error(`图片文件过大，最大支持 ${this.maxSize / 1024 / 1024}MB`);
      }

      logger.info(`图片下载成功，大小: ${imageBuffer.length} bytes`);
      return imageBuffer;

    } catch (error) {
      logger.botError(error, { fileId });
      throw new Error(`下载图片失败: ${error.message}`);
    }
  }

  // 压缩和优化图片
  async processImage(imageBuffer, options = {}) {
    try {
      logger.info('开始处理图片');
      
      const {
        maxWidth = 800,
        maxHeight = 600,
        quality = 80
      } = options;

      const image = await Jimp.read(imageBuffer);
      
      // 获取原始尺寸
      const originalWidth = image.bitmap.width;
      const originalHeight = image.bitmap.height;
      
      logger.debug(`原始图片尺寸: ${originalWidth}x${originalHeight}`);

      // 如果图片太大，进行缩放
      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        image.scaleToFit(maxWidth, maxHeight);
        logger.debug(`图片已缩放到: ${image.bitmap.width}x${image.bitmap.height}`);
      }

      // 设置质量并转换为Buffer
      const processedBuffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      
      logger.info(`图片处理完成，压缩后大小: ${processedBuffer.length} bytes`);
      return processedBuffer;

    } catch (error) {
      logger.botError(error, { originalSize: imageBuffer.length });
      throw new Error(`图片处理失败: ${error.message}`);
    }
  }

  // 提取图片中的文本（OCR）
  async extractTextFromImage(imageBuffer) {
    try {
      logger.info('开始从图片提取文本');
      
      // 这里可以接入OCR服务，如：
      // - 百度OCR API
      // - 腾讯OCR API  
      // - Google Vision API
      // - Azure Computer Vision API
      
      // 目前返回模拟结果
      const mockText = this.generateMockOCRResult();
      
      logger.info(`文本提取完成: ${mockText}`);
      return mockText;

    } catch (error) {
      logger.botError(error, { imageSize: imageBuffer.length });
      throw new Error(`文本提取失败: ${error.message}`);
    }
  }

  // 图片商品识别
  async recognizeProduct(imageBuffer) {
    try {
      logger.info('开始识别图片中的商品');
      
      // 这里可以接入商品识别API，如：
      // - 淘宝拍照购物API
      // - 京东图像搜索API
      // - Google Lens API
      // - 百度图像识别API
      
      // 目前返回模拟结果
      const mockProducts = this.generateMockProductRecognition();
      
      logger.info(`商品识别完成，找到 ${mockProducts.length} 个相似商品`);
      return mockProducts;

    } catch (error) {
      logger.botError(error, { imageSize: imageBuffer.length });
      throw new Error(`商品识别失败: ${error.message}`);
    }
  }

  // 验证图片格式
  isValidImageFormat(buffer) {
    const jpegHeader = [0xFF, 0xD8, 0xFF];
    const pngHeader = [0x89, 0x50, 0x4E, 0x47];
    const webpHeader = [0x52, 0x49, 0x46, 0x46];

    const headers = [jpegHeader, pngHeader, webpHeader];
    
    return headers.some(header => {
      return header.every((byte, index) => buffer[index] === byte);
    });
  }

  // 获取图片信息
  async getImageInfo(imageBuffer) {
    try {
      const image = await Jimp.read(imageBuffer);
      return {
        width: image.bitmap.width,
        height: image.bitmap.height,
        size: imageBuffer.length,
        format: image.getMIME()
      };
    } catch (error) {
      logger.botError(error, { imageSize: imageBuffer.length });
      return null;
    }
  }

  // 生成模拟OCR结果
  generateMockOCRResult() {
    const mockTexts = [
      '苹果 iPhone 15 Pro',
      '华为 Mate 60 Pro',
      '小米14 Ultra',
      '三星 Galaxy S24',
      'MacBook Pro M3',
      'iPad Air',
      '耐克运动鞋',
      '阿迪达斯球鞋'
    ];
    
    return mockTexts[Math.floor(Math.random() * mockTexts.length)];
  }

  // 生成模拟商品识别结果
  generateMockProductRecognition() {
    return [
      {
        title: '苹果 iPhone 15 Pro 钛原色 256GB',
        price: '¥8999',
        image: 'https://via.placeholder.com/300x300?text=iPhone+15+Pro',
        url: 'https://item.taobao.com/item.htm?id=123456789',
        platform: '淘宝',
        similarity: 0.95,
        description: '全新苹果iPhone 15 Pro，钛金属材质，A17 Pro芯片'
      },
      {
        title: '苹果iPhone15Pro 原装正品手机',  
        price: '¥8899',
        image: 'https://via.placeholder.com/300x300?text=iPhone+Similar',
        url: 'https://item.jd.com/123456.html',
        platform: '京东',
        similarity: 0.88,
        description: '京东自营，正品保障，全国联保'
      }
    ];
  }

  // 创建图片缩略图
  async createThumbnail(imageBuffer, size = 150) {
    try {
      const image = await Jimp.read(imageBuffer);
      const thumbnail = await image
        .resize(size, size)
        .quality(70)
        .getBufferAsync(Jimp.MIME_JPEG);
        
      return thumbnail;
    } catch (error) {
      logger.botError(error, { imageSize: imageBuffer.length });
      throw new Error(`创建缩略图失败: ${error.message}`);
    }
  }
}

module.exports = new ImageService(); 