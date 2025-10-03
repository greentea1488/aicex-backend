const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTokens() {
  try {
    // Найдем пользователя Алексей (предполагаем что это вы)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Алексей' } },
          { firstName: { contains: 'Aleksej' } },
          { username: { contains: 'aleksej' } }
        ]
      }
    });

    console.log('Найденные пользователи:', users);

    if (users.length > 0) {
      const user = users[0]; // Берем первого найденного
      
      // Добавляем 150 токенов
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { tokens: { increment: 150 } }
      });

      console.log(`✅ Добавлено 150 токенов пользователю ${user.firstName}`);
      console.log(`💰 Новый баланс: ${updatedUser.tokens} токенов`);
    } else {
      console.log('❌ Пользователь не найден');
      
      // Показываем всех пользователей для поиска
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          telegramId: true,
          firstName: true,
          username: true,
          tokens: true
        }
      });
      
      console.log('Все пользователи в базе:');
      allUsers.forEach(u => {
        console.log(`ID: ${u.id}, TG: ${u.telegramId}, Имя: ${u.firstName}, Username: ${u.username}, Токены: ${u.tokens}`);
      });
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTokens();
