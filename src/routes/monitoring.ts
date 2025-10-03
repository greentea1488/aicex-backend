import { Router } from 'express';
import { monitoringController } from '../controllers/MonitoringController';

const router = Router();

/**
 * Проверка здоровья системы (публичный endpoint)
 */
router.get('/health', monitoringController.getSystemHealth.bind(monitoringController));

/**
 * Системная статистика (только для админов)
 */
router.get('/stats', monitoringController.getSystemStats.bind(monitoringController));

/**
 * Активные алерты
 */
router.get('/alerts', monitoringController.getActiveAlerts.bind(monitoringController));

/**
 * Разрешить алерт
 */
router.post('/alerts/:alertId/resolve', monitoringController.resolveAlert.bind(monitoringController));

/**
 * Создать тестовый алерт
 */
router.post('/test-alert', monitoringController.createTestAlert.bind(monitoringController));

/**
 * Запуск проверки производительности
 */
router.post('/performance-check', monitoringController.runPerformanceCheck.bind(monitoringController));

export default router;
