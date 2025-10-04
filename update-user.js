const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function updateUser() {
  try {
    console.log('🔍 Searching for user with telegramId: 669231710');
    
    // Найдем пользователя
    const user = await prisma.user.findUnique({
      where: { telegramId: 669231710 },
      include: {
        balance: true,
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      tokens: user.tokens,
      balance: user.balance,
      subscription: user.subscription
    });

    // Обновим токены пользователя
    const updatedUser = await prisma.user.update({
      where: { telegramId: 669231710 },
      data: {
        tokens: 150,
        photoUrl: 'https://t.me/i/userpic/320/fxdefxde.jpg' // Добавим аватарку
      }
    });

    // Создадим или обновим баланс
    await prisma.balance.upsert({
      where: { userId: user.id },
      update: {
        tokens: 150,
        freeTokens: 50,
        paidTokens: 100
      },
      create: {
        userId: user.id,
        tokens: 150,
        freeTokens: 50,
        paidTokens: 100
      }
    });

    console.log('✅ User updated successfully!');
    console.log('New tokens:', updatedUser.tokens);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUser();
