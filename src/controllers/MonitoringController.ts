import { Request, Response } from 'express';
import { monitoringService } from '../services/MonitoringService';
import { logger } from '../utils/logger';

/**
 * Контроллер для мониторинга системы
 */
export class MonitoringController {

  /**
   * Проверка здоровья системы
   * GET /api/monitoring/health
   */
  async getSystemHealth(req: Request, res: Response) {
    try {
      const health = await monitoringService.checkSystemHealth();
      
      // Устанавливаем HTTP статус в зависимости от здоровья системы
      let statusCode = 200;
      if (health.status === 'warning') statusCode = 206;
      if (health.status === 'critical') statusCode = 503;
      
      res.status(statusCode).json({
        success: true,
        health
      });
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки здоровья системы'
      });
    }
  }

  /**
   * Получить системную статистику (только для админов)
   * GET /api/monitoring/stats
   */
  async getSystemStats(req: Request, res: Response) {
    try {
      // Здесь должна быть проверка прав администратора
      // const isAdmin = await checkAdminPermissions(req);
      // if (!isAdmin) {
      //   return res.status(403).json({ success: false, error: 'Access denied' });
      // }

      const stats = await monitoringService.getSystemStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статистики системы'
      });
    }
  }

  /**
   * Получить активные алерты
   * GET /api/monitoring/alerts
   */
  async getActiveAlerts(req: Request, res: Response) {
    try {
      const alerts = monitoringService.getActiveAlerts();
      
      res.json({
        success: true,
        alerts
      });
    } catch (error) {
      logger.error('Get alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения алертов'
      });
    }
  }

  /**
   * Разрешить алерт
   * POST /api/monitoring/alerts/:alertId/resolve
   */
  async resolveAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params;
      
      if (!alertId) {
        return res.status(400).json({
          success: false,
          error: 'Не указан ID алерта'
        });
      }

      monitoringService.resolveAlert(alertId);
      
      res.json({
        success: true,
        message: 'Алерт разрешен'
      });
    } catch (error) {
      logger.error('Resolve alert error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка разрешения алерта'
      });
    }
  }

  /**
   * Создать тестовый алерт (для тестирования)
   * POST /api/monitoring/test-alert
   */
  async createTestAlert(req: Request, res: Response) {
    try {
      const { type = 'info', message = 'Test alert' } = req.body;
      
      monitoringService.createAlert(type, message);
      
      res.json({
        success: true,
        message: 'Тестовый алерт создан'
      });
    } catch (error) {
      logger.error('Create test alert error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка создания тестового алерта'
      });
    }
  }

  /**
   * Запуск мониторинга производительности
   * POST /api/monitoring/performance-check
   */
  async runPerformanceCheck(req: Request, res: Response) {
    try {
      await monitoringService.monitorPerformance();
      
      res.json({
        success: true,
        message: 'Проверка производительности запущена'
      });
    } catch (error) {
      logger.error('Performance check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки производительности'
      });
    }
  }
}

export const monitoringController = new MonitoringController();
