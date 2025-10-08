import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Очищаем существующие планы
  await prisma.subscriptionPlan.deleteMany({});
  console.log('🗑️  Cleared existing subscription plans');

  // Создаем планы подписки
  const plans = [
    {
      name: 'basic',
      displayName: 'Базовая подписка',
      description: 'Базовый доступ к AI генерации',
      priceRub: 499,
      priceUsd: 500, // $5.00 в центах
      priceEur: 499, // €4.99 в центах
      tokens: 1000,
      features: JSON.parse(JSON.stringify(['Базовый доступ к AI генерации изображений и видео'])),
      lavaOfferId: '009b0062-7c4a-4c8c-944c-a3313d8ac424',
      isActive: true
    },
    {
      name: 'pro',
      displayName: 'Про подписка',
      description: 'Профессиональный доступ',
      priceRub: 1699,
      priceUsd: 1800, // $18.00 в центах
      priceEur: 1699, // €16.99 в центах
      tokens: 5000,
      features: JSON.parse(JSON.stringify([
        'Профессиональный доступ ко всем AI моделям',
        'Приоритетная обработка'
      ])),
      lavaOfferId: '9018f9c8-2e1a-4402-8240-4a2587f8b82a',
      isActive: true
    },
    {
      name: 'premium',
      displayName: 'Премиум подписка',
      description: 'Максимальный доступ',
      priceRub: 2999,
      priceUsd: 3100, // $31.00 в центах
      priceEur: 2999, // €29.99 в центах
      tokens: 15000,
      features: JSON.parse(JSON.stringify([
        'Максимальный доступ для профессионалов',
        'API доступ',
        'Коммерческая лицензия'
      ])),
      lavaOfferId: '155e0453-b562-4af2-b588-3bcef486c3e3',
      isActive: true
    }
  ];

  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.create({
      data: plan
    });
    console.log(`✅ Created plan: ${created.displayName} (${created.name})`);
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
