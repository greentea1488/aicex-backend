import { subscriptionService } from '../services/SubscriptionService';
import { monitoringService } from '../services/MonitoringService';
import { logger } from './logger';

/**
 * Настройка задач для системы (без cron пока)
 */
export function setupCronJobs() {
  logger.info('⏰ Setting up system maintenance tasks...');
  
  // Запускаем проверку подписок каждый час
  setInterval(async () => {
    try {
      logger.info('🕐 Running expired subscriptions check...');
      await subscriptionService.checkExpiredSubscriptions();
      logger.info('✅ Expired subscriptions check completed');
    } catch (error) {
      logger.error('❌ Error in expired subscriptions task:', error);
    }
  }, 60 * 60 * 1000); // каждый час

  // Мониторинг производительности каждые 15 минут
  setInterval(async () => {
    try {
      logger.info('📊 Running performance monitoring...');
      await monitoringService.monitorPerformance();
      logger.info('✅ Performance monitoring completed');
    } catch (error) {
      logger.error('❌ Error in performance monitoring task:', error);
    }
  }, 15 * 60 * 1000); // каждые 15 минут

  // Ежедневная очистка (каждые 24 часа)
  setInterval(async () => {
    try {
      logger.info('🌙 Running daily maintenance tasks...');
      
      // Очистка старых алертов
      monitoringService.cleanupOldAlerts();
      
      logger.info('✅ Daily maintenance completed');
    } catch (error) {
      logger.error('❌ Error in daily maintenance task:', error);
    }
  }, 24 * 60 * 60 * 1000); // каждые 24 часа

  logger.info('⏰ System maintenance tasks initialized successfully');
}
