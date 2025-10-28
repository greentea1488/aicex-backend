/**
 * Скрипт для назначения пользователя администратором
 * 
 * Использование:
 * node make-admin.js TELEGRAM_ID
 * 
 * Пример:
 * node make-admin.js 669231710
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  const telegramId = parseInt(process.argv[2]);
  
  if (!telegramId || isNaN(telegramId)) {
    console.error('❌ Ошибка: укажите Telegram ID');
    console.log('Использование: node make-admin.js TELEGRAM_ID');
    console.log('Пример: node make-admin.js 669231710');
    process.exit(1);
  }
  
  try {
    console.log(`🔍 Ищем пользователя с Telegram ID: ${telegramId}...`);
    
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });
    
    if (!user) {
      console.error(`❌ Пользователь с Telegram ID ${telegramId} не найден`);
      console.log('\nСписок пользователей в базе:');
      const users = await prisma.user.findMany({
        select: { telegramId: true, username: true, firstName: true, role: true }
      });
      users.forEach(u => {
        console.log(`  - ${u.telegramId} (@${u.username}) - ${u.firstName || 'N/A'} - Role: ${u.role}`);
      });
      process.exit(1);
    }
    
    console.log(`✅ Найден: @${user.username} (${user.firstName || 'N/A'})`);
    console.log(`   Текущая роль: ${user.role}`);
    
    if (user.role === 'ADMIN') {
      console.log('✨ Пользователь уже является администратором!');
      process.exit(0);
    }
    
    console.log('🔄 Назначаем роль ADMIN...');
    
    await prisma.user.update({
      where: { telegramId },
      data: { role: 'ADMIN' }
    });
    
    console.log('✅ Готово! Пользователь теперь администратор!');
    console.log('\n🎉 Теперь можно зайти в админ-панель:');
    console.log('   1. Откройте WebApp в Telegram');
    console.log('   2. Перейдите по URL: /admin');
    console.log('   3. Наслаждайтесь админ-панелью! 🚀');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();

