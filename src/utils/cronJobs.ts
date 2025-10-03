import cron from 'node-cron';
import { subscriptionService } from '../services/SubscriptionService';
import { monitoringService } from '../services/MonitoringService';
import { logger } from './logger';

/**
 * Настройка cron задач для системы
 */
export function setupCronJobs() {
  logger.info('⏰ Setting up cron jobs...');
  
  // Проверка истекших подписок каждый час (в начале часа)
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('🕐 Running expired subscriptions check...');
      await subscriptionService.checkExpiredSubscriptions();
      logger.info('✅ Expired subscriptions check completed');
    } catch (error) {
      logger.error('❌ Error in expired subscriptions cron job:', error);
    }
  }, {
    timezone: "Europe/Moscow"
  });

  // Мониторинг производительности каждые 15 минут
  cron.schedule('*/15 * * * *', async () => {
    try {
      logger.info('📊 Running performance monitoring...');
      await monitoringService.monitorPerformance();
      logger.info('✅ Performance monitoring completed');
    } catch (error) {
      logger.error('❌ Error in performance monitoring cron job:', error);
    }
  }, {
    timezone: "Europe/Moscow"
  });

  // Ежедневная очистка в полночь
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('🌙 Running daily maintenance tasks...');
      
      // Очистка старых алертов
      monitoringService.cleanupOldAlerts();
      
      // Очистка старых логов (старше 30 дней)
      await cleanupOldLogs();
      
      logger.info('✅ Daily maintenance completed');
    } catch (error) {
      logger.error('❌ Error in daily maintenance cron job:', error);
    }
  }, {
    timezone: "Europe/Moscow"
  });

  // Еженедельная очистка базы данных (воскресенье в 2:00)
  cron.schedule('0 2 * * 0', async () => {
    try {
      logger.info('🗄️ Running weekly database cleanup...');
      
      // Очистка старых генераций (старше 90 дней)
      await cleanupOldGenerations();
      
      // Очистка старых токенов истории (старше 60 дней)
      await cleanupOldTokenHistory();
      
      logger.info('✅ Weekly database cleanup completed');
    } catch (error) {
      logger.error('❌ Error in weekly cleanup cron job:', error);
    }
  }, {
    timezone: "Europe/Moscow"
  });

  logger.info('⏰ Cron jobs initialized successfully');
}

/**
 * Очистка старых логов активности
 */
async function cleanupOldLogs() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { prisma } = await import('../utils/prismaClient');
    
    const deletedCount = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo }
      }
    });

    logger.info(`🗑️ Cleaned up ${deletedCount.count} old activity logs`);
  } catch (error) {
    logger.error('Error cleaning up old logs:', error);
  }
}

/**
 * Очистка старых генераций
 */
async function cleanupOldGenerations() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { prisma } = await import('../utils/prismaClient');
    
    const deletedCount = await prisma.generationHistory.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        status: { in: ['completed', 'failed'] }
      }
    });

    logger.info(`🗑️ Cleaned up ${deletedCount.count} old generations`);
  } catch (error) {
    logger.error('Error cleaning up old generations:', error);
  }
}

/**
 * Очистка старой истории токенов
 */
async function cleanupOldTokenHistory() {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { prisma } = await import('../utils/prismaClient');
    
    const deletedCount = await prisma.tokenHistory.deleteMany({
      where: {
        createdAt: { lt: sixtyDaysAgo }
      }
    });

    logger.info(`🗑️ Cleaned up ${deletedCount.count} old token history records`);
  } catch (error) {
    logger.error('Error cleaning up old token history:', error);
  }
}
