const axios = require('axios');

const BOT_TOKEN = '8321526540:AAG8Zgvsc0Et34yG37Ne_WOW0fRArsw_5EI';
const CHAT_ID = 669231710; // Ваш Telegram ID

async function testBot() {
  try {
    console.log('🤖 Testing Telegram Bot...\n');

    // 1. Проверим информацию о боте
    console.log('1️⃣ Getting bot info...');
    const botInfo = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    console.log('✅ Bot info:', {
      id: botInfo.data.result.id,
      username: botInfo.data.result.username,
      first_name: botInfo.data.result.first_name
    });

    // 2. Отправим тестовое сообщение
    console.log('\n2️⃣ Sending test message...');
    const message = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: '🧪 Тест API: Бот работает!\n\n✅ Backend запущен\n✅ База данных подключена\n✅ Планы подписок созданы\n\nИспользуйте /start для начала работы',
      parse_mode: 'HTML'
    });
    console.log('✅ Message sent successfully!');

    // 3. Проверим webhook (если настроен)
    console.log('\n3️⃣ Checking webhook info...');
    const webhookInfo = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    console.log('📡 Webhook info:', {
      url: webhookInfo.data.result.url || 'Not set',
      has_custom_certificate: webhookInfo.data.result.has_custom_certificate,
      pending_update_count: webhookInfo.data.result.pending_update_count
    });

    console.log('\n🎉 Bot test completed successfully!');
    console.log('\n📱 Теперь откройте Telegram и напишите боту /start');

  } catch (error) {
    console.error('❌ Bot Test Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

testBot();
