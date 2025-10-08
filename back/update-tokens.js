const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserTokens() {
  try {
    console.log('🔄 Updating user tokens to 500...');
    
    // Обновляем всех пользователей, у которых меньше 500 токенов
    const result = await prisma.user.updateMany({
      where: {
        tokens: {
          lt: 500
        }
      },
      data: {
        tokens: 500
      }
    });
    
    console.log(`✅ Updated ${result.count} users to 500 tokens`);
    
    // Показываем статистику
    const stats = await prisma.user.groupBy({
      by: ['tokens'],
      _count: {
        tokens: true
      }
    });
    
    console.log('📊 Token distribution:');
    stats.forEach(stat => {
      console.log(`  ${stat.tokens} tokens: ${stat._count.tokens} users`);
    });
    
  } catch (error) {
    console.error('❌ Error updating tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserTokens();
