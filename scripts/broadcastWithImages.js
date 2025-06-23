#!/usr/bin/env node

const { config } = require('../src/utils/config');
const TelegramBot = require('../src/bot/bot');

// 模拟产品数据（使用真实的商品图片URL）
const sampleProducts = [
  {
    title: 'Multi-color ring bracelet',
    price: '$3.32',
    url: 'https://example.com/product1',
    platform: '1688',
    image: 'https://picsum.photos/400/400?random=1', // 随机图片服务
    description: 'Stylish multi-color ring bracelet perfect for daily wear'
  },
  {
    title: 'Premium Leather Wallet',
    price: '$15.99',
    url: 'https://example.com/product2', 
    platform: '淘宝',
    image: 'https://picsum.photos/400/400?random=2',
    description: 'High-quality leather wallet with multiple card slots'
  },
  {
    title: 'Wireless Bluetooth Headphones',
    price: '$29.99',
    url: 'https://example.com/product3',
    platform: '京东',
    image: 'https://picsum.photos/400/400?random=3',
    description: 'Premium wireless headphones with noise cancellation'
  },
  {
    title: 'Stainless Steel Watch',
    price: '$45.50',
    url: 'https://example.com/product4',
    platform: 'AliExpress',
    image: 'https://picsum.photos/400/400?random=4',
    description: 'Elegant stainless steel watch with water resistance'
  },
  {
    title: 'Smartphone Case',
    price: '$8.99',
    url: 'https://example.com/product5',
    platform: '天猫',
    image: 'https://picsum.photos/400/400?random=5',
    description: 'Protective smartphone case with shock absorption'
  }
];

// 目标群组ID
const TARGET_GROUP_ID = -1002851409233;

// 格式化商品卡片消息
function formatProductCard(product) {
  const cardConfig = config.productCard;
  
  let card = `🏆 <b>${cardConfig.brandName}-Popular product recommendations.</b>\n\n`;
  card += `📦 <b>${product.title}</b>\n\n`;
  card += `💰 <b>Price : ${product.price}</b>\n\n`;
  card += `🔍 <a href="${product.url}">Link Here</a>\n`;
  card += `🔍 <a href="https://www.google.com/search?q=${encodeURIComponent(product.title)}">Search more QC</a>\n\n`;
  card += `🔗 Find more items <a href="https://wa.me/${cardConfig.whatsappNumber}">WhatsApp</a> & <a href="https://discord.gg/${cardConfig.discordInvite}">discord</a>\n\n`;
  card += `🤖 <a href="https://t.me/${cardConfig.botUsername}">${cardConfig.brandName}-bot</a>\n`;
  card += `👉 <a href="${cardConfig.muleBuyBaseUrl}/product/${generateProductId(product)}">mulebuy product link</a>`;

  return card;
}

// 生成商品ID
function generateProductId(product) {
  const source = product.url || product.title || 'unknown';
  return Buffer.from(source).toString('base64').substring(0, 10);
}

// 发送带图片的商品消息
async function sendProductWithImage(bot, chatId, product) {
  try {
    const caption = formatProductCard(product);
    
    console.log(`📸 正在发送商品: ${product.title}`);
    console.log(`🖼️ 图片URL: ${product.image}`);
    
    const result = await bot.bot.telegram.sendPhoto(chatId, product.image, {
      caption: caption,
      parse_mode: 'HTML'
    });
    
    console.log(`✅ 发送成功 - 消息ID: ${result.message_id}`);
    return result;
    
  } catch (error) {
    console.error(`❌ 发送失败: ${error.message}`);
    // 如果图片发送失败，尝试只发送文本
    try {
      const textMessage = formatProductCard(product);
      const result = await bot.bot.telegram.sendMessage(chatId, textMessage, {
        parse_mode: 'HTML'
      });
      console.log(`✅ 文本消息发送成功 - 消息ID: ${result.message_id}`);
      return result;
    } catch (textError) {
      console.error(`❌ 文本消息也发送失败: ${textError.message}`);
      throw textError;
    }
  }
}

// 主函数
async function main() {
  console.log('🎨 开始发送带图片的商品广播...\n');
  console.log('=' .repeat(60));
  
  try {
    // 创建机器人实例
    const bot = new TelegramBot();
    console.log('🤖 机器人实例创建成功');
    
    // 初始化推送服务
    await bot.pushService.init();
    console.log('📡 推送服务初始化完成');
    
    console.log(`🎯 目标群组: ${TARGET_GROUP_ID}`);
    console.log(`📦 准备发送 ${sampleProducts.length} 个商品\n`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // 发送每日推荐标题
    const headerMessage = `🏆 <b>${config.productCard.brandName} - Daily Product Showcase</b>\n\n📅 <b>${new Date().toLocaleDateString('zh-CN')}</b>\n\n🎁 Today's Featured Products:`;
    
    try {
      await bot.bot.telegram.sendMessage(TARGET_GROUP_ID, headerMessage, {
        parse_mode: 'HTML'
      });
      console.log('📢 标题消息发送成功\n');
    } catch (error) {
      console.error('❌ 标题消息发送失败:', error.message);
    }
    
    // 逐个发送商品
    for (let i = 0; i < sampleProducts.length; i++) {
      const product = sampleProducts[i];
      
      console.log(`\n🔄 [${i + 1}/${sampleProducts.length}] 处理商品...`);
      console.log(`📝 商品名称: ${product.title}`);
      console.log(`💰 价格: ${product.price}`);
      
      try {
        await sendProductWithImage(bot, TARGET_GROUP_ID, product);
        successCount++;
        
        // 商品间延迟，避免发送过快
        if (i < sampleProducts.length - 1) {
          console.log('⏳ 等待 3 秒...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        failureCount++;
        console.error(`❌ 商品 "${product.title}" 发送失败:`, error.message);
      }
    }
    
    // 发送结尾消息
    const footerMessage = `\n🎊 <b>That's all for today!</b>\n\n📱 Follow us for more amazing deals:\n🔗 <a href="https://wa.me/${config.productCard.whatsappNumber}">WhatsApp</a> | <a href="https://discord.gg/${config.productCard.discordInvite}">Discord</a>\n\n🤖 <a href="https://t.me/${config.productCard.botUsername}">${config.productCard.brandName}-bot</a>`;
    
    try {
      await bot.bot.telegram.sendMessage(TARGET_GROUP_ID, footerMessage, {
        parse_mode: 'HTML'
      });
      console.log('\n📝 结尾消息发送成功');
    } catch (error) {
      console.error('❌ 结尾消息发送失败:', error.message);
    }
    
    // 统计结果
    console.log('\n' + '=' .repeat(60));
    console.log('📊 广播完成统计:');
    console.log(`✅ 成功: ${successCount} 个商品`);
    console.log(`❌ 失败: ${failureCount} 个商品`);
    console.log(`📝 总计: ${sampleProducts.length} 个商品`);
    console.log('\n🎯 广播任务完成！');
    
  } catch (error) {
    console.error('❌ 广播过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
} 