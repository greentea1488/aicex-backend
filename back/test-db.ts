import { config } from "dotenv";
config();

import { prisma } from "./src/utils/prismaClient";

async function testDB() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Проверяем планы подписки
    console.log('📋 Checking SubscriptionPlan collection...');
    const plans = await prisma.subscriptionPlan.findMany();
    console.log(`Found ${plans.length} plans\n`);

    if (plans.length > 0) {
      console.log('Plans structure:');
      plans.forEach(plan => {
        console.log({
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          priceRub: plan.priceRub,
          tokens: plan.tokens,
          lavaOfferId: plan.lavaOfferId
        });
      });
    } else {
      console.log('⚠️  No plans found in database');
    }

    // Проверяем пользователей
    console.log('\n👥 Checking User collection...');
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users`);

    if (userCount > 0) {
      const firstUser = await prisma.user.findFirst();
      console.log('First user:', {
        id: firstUser?.id,
        telegramId: firstUser?.telegramId,
        username: firstUser?.username,
        tokens: firstUser?.tokens
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
