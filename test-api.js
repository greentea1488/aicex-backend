const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:8080/api';
const JWT_SECRET = '5771df865547c3f58cfac91b18ae2d3d0ba21aa03c68a7dcd2f87ce8aabf6e2d4ab52715410b4aa75c8e8a72a9251a5345d8cac9357e037f0ceef8d16f9a0875';

// Создаем JWT токен для тестирования
const testToken = jwt.sign({
  id: '68dee8afd709b28c93efc193',
  userId: '68dee8afd709b28c93efc193',
  telegramId: 669231710,
  username: 'fxdefxde'
}, JWT_SECRET, { expiresIn: '24h' });

console.log('🔑 Test JWT Token:', testToken);

async function testAPI() {
  try {
    console.log('\n🧪 Testing API endpoints...\n');

    // 1. Test subscription plans (public endpoint)
    console.log('1️⃣ Testing subscription plans...');
    const plansResponse = await axios.get(`${API_BASE}/subscription/plans`);
    console.log('✅ Subscription plans:', plansResponse.data.length, 'plans found');
    console.log('Plans:', plansResponse.data.map(p => `${p.displayName} - ${p.priceRub}₽`));

    // 2. Test user profile (protected endpoint)
    console.log('\n2️⃣ Testing user profile...');
    const profileResponse = await axios.get(`${API_BASE}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('✅ User profile:', {
      id: profileResponse.data.id,
      firstName: profileResponse.data.firstName,
      tokens: profileResponse.data.tokens,
      subscription: profileResponse.data.subscription,
      avatar: profileResponse.data.avatar
    });

    // 3. Test user tokens
    console.log('\n3️⃣ Testing user tokens...');
    const tokensResponse = await axios.get(`${API_BASE}/user/tokens`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('✅ User tokens:', tokensResponse.data);

    // 4. Test user subscription
    console.log('\n4️⃣ Testing user subscription...');
    const subscriptionResponse = await axios.get(`${API_BASE}/user/subscription`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('✅ User subscription:', subscriptionResponse.data);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API Test Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

testAPI();
