import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { generationLogService } from './GenerationLogService';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  database: boolean;
  services: {
    freepik: boolean;
    midjourney: boolean;
    runway: boolean;
    chatgpt: boolean;
  };
  metrics: {
    totalUsers: number;
    activeUsers24h: number;
    generationsToday: number;
    errorRate: number;
    avgResponseTime: number;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Сервис мониторинга системы и алертов
 */
export class MonitoringService {
  private alerts: Alert[] = [];
  private metrics: any = {};

  /**
   * Проверка здоровья системы
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    try {
      const health: SystemHealth = {
        status: 'healthy',
        database: false,
        services: {
          freepik: false,
          midjourney: false,
          runway: false,
          chatgpt: false
        },
        metrics: {
          totalUsers: 0,
          activeUsers24h: 0,
          generationsToday: 0,
          errorRate: 0,
          avgResponseTime: 0
        },
        alerts: this.getActiveAlerts()
      };

      // Проверка базы данных
      try {
        await prisma.user.findFirst();
        health.database = true;
      } catch (error) {
        health.database = false;
        this.createAlert('error', 'Database connection failed');
        health.status = 'critical';
      }

      // Проверка API ключей сервисов
      health.services.freepik = !!process.env.FREEPIK_API_KEY;
      health.services.midjourney = !!process.env.GEN_API_KEY;
      health.services.runway = !!process.env.RUNWAY_API_KEY;
      health.services.chatgpt = !!process.env.OPENAI_API_KEY;

      // Сбор метрик
      if (health.database) {
        health.metrics = await this.collectMetrics();
      }

      // Определение общего статуса
      if (!health.database) {
        health.status = 'critical';
      } else if (health.metrics.errorRate > 0.1 || health.alerts.length > 5) {
        health.status = 'warning';
      }

      return health;
    } catch (error) {
      logger.error('System health check failed:', error);
      return {
        status: 'critical',
        database: false,
        services: { freepik: false, midjourney: false, runway: false, chatgpt: false },
        metrics: { totalUsers: 0, activeUsers24h: 0, generationsToday: 0, errorRate: 1, avgResponseTime: 0 },
        alerts: [{ id: Date.now().toString(), type: 'error', message: 'Health check failed', timestamp: new Date(), resolved: false }]
      };
    }
  }

  /**
   * Сбор метрик системы
   */
  private async collectMetrics(): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers24h,
        generationsToday,
        failedGenerationsToday,
        totalGenerationsToday
      ] = await Promise.all([
        // Общее количество пользователей
        prisma.user.count(),
        
        // Активные пользователи за 24 часа
        prisma.user.count({
          where: {
            lastActive: { gte: yesterday }
          }
        }),
        
        // Успешные генерации сегодня
        prisma.generationHistory.count({
          where: {
            createdAt: { gte: today },
            status: 'completed'
          }
        }),
        
        // Неудачные генерации сегодня
        prisma.generationHistory.count({
          where: {
            createdAt: { gte: today },
            status: 'failed'
          }
        }),
        
        // Все генерации сегодня
        prisma.generationHistory.count({
          where: {
            createdAt: { gte: today }
          }
        })
      ]);

      const errorRate = totalGenerationsToday > 0 ? failedGenerationsToday / totalGenerationsToday : 0;

      return {
        totalUsers,
        activeUsers24h,
        generationsToday,
        errorRate,
        avgResponseTime: this.calculateAvgResponseTime()
      };
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
      return {
        totalUsers: 0,
        activeUsers24h: 0,
        generationsToday: 0,
        errorRate: 1,
        avgResponseTime: 0
      };
    }
  }

  /**
   * Создание алерта
   */
  createAlert(type: 'error' | 'warning' | 'info', message: string): void {
    const alert: Alert = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    
    // Ограничиваем количество алертов
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }

    logger.warn(`ALERT [${type.toUpperCase()}]: ${message}`);

    // Отправка критических алертов (здесь можно добавить интеграцию с Telegram, email и т.д.)
    if (type === 'error') {
      this.sendCriticalAlert(alert);
    }
  }

  /**
   * Получение активных алертов
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Разрешение алерта
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alert.message}`);
    }
  }

  /**
   * Отправка критических алертов
   */
  private async sendCriticalAlert(alert: Alert): Promise<void> {
    try {
      // Здесь можно добавить отправку в Telegram, email, Slack и т.д.
      logger.error(`🚨 CRITICAL ALERT: ${alert.message}`);
      
      // Пример отправки в Telegram (если настроен админский бот)
      if (process.env.ADMIN_BOT_TOKEN && process.env.ADMIN_CHAT_ID) {
        // Здесь будет код отправки в Telegram
      }
    } catch (error) {
      logger.error('Failed to send critical alert:', error);
    }
  }

  /**
   * Расчет среднего времени ответа
   */
  private calculateAvgResponseTime(): number {
    // Простая реализация - можно улучшить
    return this.metrics.avgResponseTime || 0;
  }

  /**
   * Мониторинг производительности
   */
  async monitorPerformance(): Promise<void> {
    try {
      const health = await this.checkSystemHealth();
      
      // Проверка критических метрик
      if (health.metrics.errorRate > 0.2) {
        this.createAlert('error', `High error rate: ${(health.metrics.errorRate * 100).toFixed(1)}%`);
      }
      
      if (health.metrics.activeUsers24h === 0 && health.metrics.totalUsers > 10) {
        this.createAlert('warning', 'No active users in the last 24 hours');
      }
      
      if (!health.database) {
        this.createAlert('error', 'Database connection lost');
      }

      // Проверка API ключей
      Object.entries(health.services).forEach(([service, available]) => {
        if (!available) {
          this.createAlert('warning', `${service} API key not configured`);
        }
      });

    } catch (error) {
      logger.error('Performance monitoring failed:', error);
      this.createAlert('error', 'Performance monitoring system failure');
    }
  }

  /**
   * Получение системной статистики для админов
   */
  async getSystemStats(): Promise<any> {
    try {
      const health = await this.checkSystemHealth();
      const systemStats = await generationLogService.getSystemGenerationStats();
      
      return {
        health,
        systemStats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      logger.error('Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * Очистка старых алертов
   */
  cleanupOldAlerts(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > oneWeekAgo || !alert.resolved
    );
  }
}

export const monitoringService = new MonitoringService();
