#!/usr/bin/env node

/**
 * Генератор JWT секрета для AICEX AI Bot
 * Использование: node generate-jwt-secret.js
 */

const crypto = require('crypto');

function generateJWTSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function generateSecurePassword(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

console.log('🔐 AICEX AI Bot - Security Keys Generator');
console.log('==========================================');
console.log('');

console.log('📋 Скопируйте эти значения в Railway Variables:');
console.log('');

console.log('JWT_SECRET=' + generateJWTSecret());
console.log('WEBHOOK_SECRET=' + generateSecurePassword(48));
console.log('');

console.log('💡 Дополнительные рекомендации:');
console.log('- Никогда не делитесь этими ключами');
console.log('- Используйте разные ключи для разных окружений');
console.log('- Регулярно обновляйте секретные ключи');
console.log('');

console.log('✅ Готово! Используйте эти ключи в Railway переменных окружения.');
