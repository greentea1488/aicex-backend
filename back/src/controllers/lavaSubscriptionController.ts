import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Новый контроллер для правильного LAVA Recurrent API
export const createLavaSubscription = async (req: Request, res: Response) => {
  try {
    logger.info('🔍 LAVA SUBSCRIPTION: Request received', {
      body: req.body,
      method: req.method,
      url: req.url
    });

    const { plan, userId } = req.body;

    if (!userId) {
      logger.error('❌ LAVA: Missing userId');
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!plan || !["basic", "pro", "premium"].includes(plan)) {
      logger.error('❌ LAVA: Invalid plan', { plan });
      return res.status(400).json({ error: "Invalid plan" });
    }

    // Проверяем настройки LAVA
    if (!process.env.LAVA_SHOP_ID || !process.env.LAVA_SECRET_KEY) {
      logger.error('❌ LAVA: Missing configuration');
      return res.status(500).json({ error: "Payment system not configured" });
    }

    console.log('🔍 LAVA Config:', {
      hasShopId: !!process.env.LAVA_SHOP_ID,
      hasSecret: !!process.env.LAVA_SECRET_KEY,
      shopIdLength: process.env.LAVA_SHOP_ID?.length || 0
    });

    // Импортируем LAVA client
    const { Lava } = await import('../lib/lavaClient');

    // Получаем информацию о плане из БД
    const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: plan }
    });
    
    if (!subscriptionPlan) {
      logger.error('Subscription plan not found', { plan });
      return res.status(400).json({ error: 'Subscription plan not found' });
    }

    // Используем lavaProductId или lavaOfferId как fallback
    const lavaProductId = subscriptionPlan.lavaProductId || subscriptionPlan.lavaOfferId;

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      logger.error('User not found', { userId });
      return res.status(400).json({ error: 'User not found' });
    }

    // Создаем email для пользователя если его нет
    const userEmail = user.phone ? `${user.phone}@telegram.user` : `user${user.telegramId}@aicex.bot`;

    logger.info('✅ LAVA: Starting subscription flow', {
      userId,
      plan,
      email: userEmail,
      lavaProductId: lavaProductId
    });

    // 1. Создаем consumer (подписчика)
    const consumerId = userId; // используем userId как consumerId
    
    try {
      await Lava.createConsumer({
        consumerId,
        email: userEmail,
        phone: user.phone || undefined
      });

      // Сохраняем consumer в БД (пока закомментируем так как модель может не существовать)
      /*
      await prisma.lavaConsumer.upsert({
        where: { consumerId },
        update: {},
        create: { consumerId, userId },
      });
      */

      logger.info('✅ LAVA: Consumer created', { consumerId });
    } catch (consumerError: any) {
      logger.warn('⚠️ LAVA: Consumer creation failed (might already exist)', consumerError.message);
    }

    // 2. Создаем подписку
    const orderId = `order_${Date.now()}_${userId.slice(-8)}`; // уникальный orderId
    
    const subscriptionResponse = await Lava.createSubscription({
      productId: lavaProductId,
      consumerId,
      orderId
    });

    // 3. Сохраняем подписку в БД (пока закомментируем)
    /*
    const lavaSubscription = await prisma.lavaSubscription.create({
      data: {
        userId,
        consumerId,
        productId: lavaProductId,
        period: 'one_month', // можно настроить
        orderId,
        status: 'created',
      },
    });
    */

    logger.info('✅ LAVA: Subscription created', {
      orderId,
      // subscriptionDbId: lavaSubscription.id,
      response: subscriptionResponse
    });

    // Возвращаем успешный ответ
    const successResponse = {
      success: true,
      orderId,
      // subscriptionId: lavaSubscription.id,
      paymentUrl: (subscriptionResponse as any).paymentUrl || `https://pay.lava.ru/subscription/${orderId}`,
      amount: subscriptionPlan.priceRub,
      currency: 'RUB',
      lavaResponse: subscriptionResponse
    };

    return res.status(200).json(successResponse);

  } catch (error: any) {
    logger.error('💥 LAVA SUBSCRIPTION: Exception', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Subscription creation failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Получение статуса подписки
export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const { Lava } = await import('../lib/lavaClient');
    const status = await Lava.getStatusBy({ orderId });
    
    res.json(status);
  } catch (error: any) {
    logger.error('Error getting subscription status:', error);
    res.status(500).json({ error: error.message });
  }
};

// Отмена подписки
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const { Lava } = await import('../lib/lavaClient');
    const result = await Lava.unsubscribe({ orderId });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
};

// Webhook для LAVA (упрощенная версия)
export const lavaWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.header('Authorization');
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    
    // Проверяем подпись (если настроена)
    if (process.env.LAVA_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.LAVA_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('hex');
        
      if (signature !== expectedSignature) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    logger.info('🔔 LAVA Webhook received:', req.body);

    const { status, order_id, subscription_id } = req.body;

    // Обрабатываем статусы
    if (status === 'activated') {
      logger.info('✅ Subscription activated:', { order_id, subscription_id });
      // TODO: Активировать подписку пользователя
    } else if (status === 'suspended') {
      logger.warn('⚠️ Subscription suspended:', { order_id, subscription_id });
      // TODO: Приостановить подписку
    } else if (status === 'deactivated') {
      logger.info('❌ Subscription deactivated:', { order_id, subscription_id });
      // TODO: Деактивировать подписку
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
};
