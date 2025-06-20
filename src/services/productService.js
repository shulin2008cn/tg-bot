const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class ProductService {
  constructor() {
    this.supportedDomains = [
      'taobao.com',
      'tmall.com',
      'jd.com', 
      '1688.com',
      'amazon.com',
      'aliexpress.com'
    ];
  }

  // 从链接提取商品信息
  async extractProductFromUrl(url) {
    try {
      logger.info(`开始提取商品信息，URL: ${url}`);
      
      const domain = this.getDomainFromUrl(url);
      if (!this.isSupportedDomain(domain)) {
        throw new Error(`不支持的商城域名: ${domain}`);
      }

      // 根据不同域名使用不同的提取策略
      let productInfo = null;
      
      if (domain.includes('taobao') || domain.includes('tmall')) {
        productInfo = await this.extractFromTaobao(url);
      } else if (domain.includes('jd.com')) {
        productInfo = await this.extractFromJD(url);
      } else if (domain.includes('1688.com')) {
        productInfo = await this.extractFrom1688(url);
      } else {
        productInfo = await this.extractGeneric(url);
      }

      logger.productSearch(url, [productInfo]);
      return productInfo;

    } catch (error) {
      logger.botError(error, { url });
      throw error;
    }
  }

  // 通过商品名称搜索
  async searchProductByName(productName) {
    try {
      logger.info(`搜索商品: ${productName}`);
      
      // 这里可以接入各种商品API
      // 示例：使用淘宝客API、京东联盟API等
      const results = await this.searchOnMultiplePlatforms(productName);
      
      logger.productSearch(productName, results);
      return results;

    } catch (error) {
      logger.botError(error, { productName });
      throw error;
    }
  }

  // 从图片识别商品（OCR + 图像识别）
  async recognizeProductFromImage(imageBuffer) {
    try {
      logger.info('开始从图片识别商品信息');
      
      // 这里可以接入图像识别API
      // 如百度AI、腾讯AI、阿里云AI等
      const recognitionResult = await this.performImageRecognition(imageBuffer);
      
      if (recognitionResult.text) {
        // 如果识别出文字，尝试搜索
        return await this.searchProductByName(recognitionResult.text);
      }
      
      return null;

    } catch (error) {
      logger.botError(error, { imageSize: imageBuffer.length });
      throw error;
    }
  }

  // 私有方法：从淘宝/天猫提取
  async extractFromTaobao(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    return {
      title: $('h1').first().text().trim() || $('title').text().trim(),
      price: this.extractPrice($),
      image: this.extractImage($),
      url: url,
      platform: '淘宝/天猫',
      description: $('meta[name="description"]').attr('content') || ''
    };
  }

  // 私有方法：从京东提取
  async extractFromJD(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    return {
      title: $('.sku-name').text().trim() || $('title').text().trim(),
      price: this.extractPrice($),
      image: this.extractImage($),
      url: url,
      platform: '京东',
      description: $('meta[name="description"]').attr('content') || ''
    };
  }

  // 私有方法：从1688提取
  async extractFrom1688(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    return {
      title: $('h1').first().text().trim() || $('title').text().trim(),
      price: this.extractPrice($),
      image: this.extractImage($),
      url: url,
      platform: '1688',
      description: $('meta[name="description"]').attr('content') || ''
    };
  }

  // 私有方法：通用提取
  async extractGeneric(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    return {
      title: $('h1').first().text().trim() || $('title').text().trim(),
      price: this.extractPrice($),
      image: this.extractImage($),
      url: url,
      platform: '未知平台',
      description: $('meta[name="description"]').attr('content') || ''
    };
  }

  // 工具方法：提取价格
  extractPrice($) {
    const priceSelectors = [
      '.price', '.current-price', '.sale-price', '.price-current',
      '.tb-rmb-num', '.price-num', '.p-price', '.price-original'
    ];
    
    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        const price = priceText.match(/[\d,.]+/);
        if (price) {
          return `¥${price[0]}`;
        }
      }
    }
    
    return '价格未知';
  }

  // 工具方法：提取图片
  extractImage($) {
    const imageSelectors = [
      'img[src*="product"]', 'img[src*="item"]', 
      '.product-image img', '.item-image img',
      'img[data-src]', 'img[src]'
    ];
    
    for (const selector of imageSelectors) {
      const imgSrc = $(selector).first().attr('src') || $(selector).first().attr('data-src');
      if (imgSrc && imgSrc.startsWith('http')) {
        return imgSrc;
      }
    }
    
    return null;
  }

  // 工具方法：获取域名
  getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.toLowerCase();
    } catch {
      return '';
    }
  }

  // 工具方法：检查是否支持的域名
  isSupportedDomain(domain) {
    return this.supportedDomains.some(supported => domain.includes(supported));
  }

  // 多平台搜索（示例实现）
  async searchOnMultiplePlatforms(keyword) {
    // 这里应该接入真实的商品搜索API
    // 目前返回模拟数据
    return [
      {
        title: `${keyword} - 搜索结果示例`,
        price: '¥99.00',
        image: null, // 暂时不使用图片避免格式错误
        url: 'https://example.com/product/1',
        platform: '示例平台',
        description: `这是关于 ${keyword} 的搜索结果示例`
      }
    ];
  }

  // 图像识别（示例实现）
  async performImageRecognition(imageBuffer) {
    // 这里应该接入图像识别API
    // 目前返回模拟数据
    return {
      text: '商品识别示例',
      confidence: 0.8
    };
  }
}

module.exports = new ProductService(); 