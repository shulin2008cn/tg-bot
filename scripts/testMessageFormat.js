#!/usr/bin/env node

const { config } = require('../src/utils/config');

// 模拟商品数据
const sampleProducts = [
  {
    title: 'Multi-color ring bracelet',
    price: '$3.3192',
    url: 'https://example.com/product1',
    platform: '1688',
    image: 'https://example.com/image1.jpg'
  },
  {
    title: 'Premium Leather Wallet',
    price: '$15.99',
    url: 'https://example.com/product2', 
    platform: '淘宝',
    image: 'https://example.com/image2.jpg'
  },
  {
    title: 'Wireless Bluetooth Headphones',
    price: '$29.99',
    url: 'https://example.com/product3',
    platform: '京东',
    image: 'https://example.com/image3.jpg'
  }
];

// 模拟消息处理器的格式化方法
function formatProductCard(product) {
  const title = escapeHtml(product.title);
  const price = escapeHtml(product.price);
  const cardConfig = config.productCard;
  
  // 使用类似图片中的格式
  let card = `🏆 <b>${cardConfig.brandName}-Popular product recommendations.</b>\n\n`;
  
  // 商品标题
  if (title) {
    card += `📦 <b>${title}</b>\n\n`;
  }
  
  // 价格信息
  card += `💰 <b>Price : ${price}</b>\n\n`;
  
  // 功能链接
  card += `🔍 <a href="${product.url}">Link Here</a>\n`;
  card += `🔍 <a href="https://www.google.com/search?q=${encodeURIComponent(title)}">Search more QC</a>\n\n`;
  
  // 联系方式
  card += `🔗 Find more items <a href="https://wa.me/${cardConfig.whatsappNumber}">WhatsApp</a> & <a href="https://discord.gg/${cardConfig.discordInvite}">discord</a>\n\n`;
  
  // 机器人信息
  card += `🤖 <a href="https://t.me/${cardConfig.botUsername}">${cardConfig.brandName}-bot</a>\n`;
  card += `👉 <a href="${cardConfig.muleBuyBaseUrl}/product/${generateProductId(product)}">mulebuy product link</a>`;

  return card;
}

// 格式化推荐商品消息
function formatRecommendationMessage(products) {
  const cardConfig = config.productCard;
  
  let message = `🏆 <b>${cardConfig.brandName} - Daily Product Recommendations</b>\n\n`;
  message += `📅 <b>${new Date().toLocaleDateString('zh-CN')}</b>\n\n`;
  
  products.forEach((product, index) => {
    message += `<b>${index + 1}. ${escapeHtml(product.title)}</b>\n`;
    message += `💰 Price: <b>${escapeHtml(product.price)}</b>\n`;
    message += `🔍 <a href="${product.url}">Link Here</a>\n`;
    message += `🔍 <a href="https://www.google.com/search?q=${encodeURIComponent(product.title)}">Search more QC</a>\n\n`;
  });
  
  // 添加联系方式和机器人信息
  message += `🔗 Find more items <a href="https://wa.me/${cardConfig.whatsappNumber}">WhatsApp</a> & <a href="https://discord.gg/${cardConfig.discordInvite}">discord</a>\n\n`;
  message += `🤖 <a href="https://t.me/${cardConfig.botUsername}">${cardConfig.brandName}-bot</a>\n`;
  message += `👉 Visit <a href="${cardConfig.muleBuyBaseUrl}">mulebuy</a> for more products`;
  
  return message;
}

// 生成商品ID
function generateProductId(product) {
  const source = product.url || product.title || 'unknown';
  return Buffer.from(source).toString('base64').substring(0, 10);
}

// HTML转义
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 主函数
function main() {
  console.log('🧪 测试消息格式\n');
  console.log('=' .repeat(80));
  
  console.log('\n📱 单个商品卡片格式:');
  console.log('-'.repeat(50));
  console.log(formatProductCard(sampleProducts[0]));
  
  console.log('\n📋 每日推荐格式:');
  console.log('-'.repeat(50));
  console.log(formatRecommendationMessage(sampleProducts));
  
  console.log('\n⚙️ 当前配置:');
  console.log('-'.repeat(50));
  console.log(`品牌名称: ${config.productCard.brandName}`);
  console.log(`WhatsApp: ${config.productCard.whatsappNumber}`);
  console.log(`Discord: ${config.productCard.discordInvite}`);
  console.log(`机器人用户名: ${config.productCard.botUsername}`);
  console.log(`MuleBuy URL: ${config.productCard.muleBuyBaseUrl}`);
  
  console.log('\n✅ 测试完成！');
}

if (require.main === module) {
  main();
} 