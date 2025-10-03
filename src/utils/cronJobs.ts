import cron from 'node-cron';
import { subscriptionService } from '../services/SubscriptionService';
import { logger } from './logger';

/**
 * Настройка cron задач для системы
 */
export function setupCronJobs() {
  // Проверка истекших подписок каждый час
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('🕐 Running expired subscriptions check...');
      await subscriptionService.checkExpiredSubscriptions();
      logger.info('✅ Expired subscriptions check completed');
    } catch (error) {
      logger.error('❌ Error in expired subscriptions cron job:', error);
    }
  });

  // Проверка каждый день в полночь для очистки старых данных
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('🌙 Running daily maintenance tasks...');
      
      // Здесь можно добавить другие задачи обслуживания
      // Например, очистка старых логов, архивирование данных и т.д.
      
      logger.info('✅ Daily maintenance completed');
    } catch (error) {
      logger.error('❌ Error in daily maintenance cron job:', error);
    }
  });

  logger.info('⏰ Cron jobs initialized successfully');
}
