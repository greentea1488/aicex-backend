import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Создаем планы подписок
  const plans = [
    {
      name: 'free',
      displayName: 'Бесплатный',
      description: 'Базовые функции AI',
      priceRub: 0,
      priceUsd: 0,
      priceEur: 0,
      tokens: 100,
      features: {
        imageGeneration: true,
        chatGPT: true,
        videoGeneration: false,
        prioritySupport: false,
        maxGenerationsPerDay: 10
      },
      lavaOfferId: 'free-plan',
      isActive: true
    },
    {
      name: 'basic',
      displayName: 'Базовый',
      description: 'Расширенные возможности AI',
      priceRub: 499,
      priceUsd: 500, // в центах
      priceEur: 450, // в центах
      tokens: 1000,
      features: {
        imageGeneration: true,
        chatGPT: true,
        videoGeneration: true,
        prioritySupport: false,
        maxGenerationsPerDay: 50
      },
      lavaOfferId: 'basic-plan-monthly',
      isActive: true
    },
    {
      name: 'pro',
      displayName: 'Про',
      description: 'Профессиональные инструменты AI',
      priceRub: 1699,
      priceUsd: 1800, // в центах
      priceEur: 1600, // в центах
      tokens: 5000,
      features: {
        imageGeneration: true,
        chatGPT: true,
        videoGeneration: true,
        prioritySupport: true,
        maxGenerationsPerDay: 200,
        advancedModels: true
      },
      lavaOfferId: 'pro-plan-monthly',
      isActive: true
    },
    {
      name: 'premium',
      displayName: 'Премиум',
      description: 'Безлимитные возможности AI',
      priceRub: 2999,
      priceUsd: 3100, // в центах
      priceEur: 2800, // в центах
      tokens: 15000,
      features: {
        imageGeneration: true,
        chatGPT: true,
        videoGeneration: true,
        prioritySupport: true,
        maxGenerationsPerDay: -1, // безлимит
        advancedModels: true,
        customModels: true,
        apiAccess: true
      },
      lavaOfferId: 'premium-plan-monthly',
      isActive: true
    }
  ];

  // Создаем планы подписок
  for (const planData of plans) {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: planData.name }
    });

    if (!existingPlan) {
      await prisma.subscriptionPlan.create({
        data: planData
      });
      console.log(`✅ Created plan: ${planData.displayName}`);
    } else {
      // Обновляем существующий план
      await prisma.subscriptionPlan.update({
        where: { name: planData.name },
        data: planData
      });
      console.log(`🔄 Updated plan: ${planData.displayName}`);
    }
  }

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
