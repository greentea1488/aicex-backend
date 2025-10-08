import { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';

// Безопасный запрос к LAVA Gate API
async function createInvoiceSafe(payload: any, log: any) {
  try {
    const resp = await axios.post(
      "https://gate.lava.top/api/v2/invoice",
      payload,
      {
        headers: {
          "X-Api-Key": process.env.LAVA_API_KEY!,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10000,
        // 201 — норма для создания счета
        validateStatus: s => s >= 200 && s < 300,
      }
    );
    return { ok: true as const, status: resp.status, data: resp.data };
  } catch (e) {
    const err = e as AxiosError<any>;
    const status = err.response?.status ?? 500;
    const data = err.response?.data ?? err.message;
    // ⚠️ логируй БЕЗ ключей и без циклических объектов
    log?.error({ lava_status: status, lava_data: data }, "LAVA invoice error");
    return { ok: false as const, status, data };
  }
}

export const createLavaSubscription = async (req: Request, res: Response) => {
  try {
    logger.info('Lava controller hit', {
      method: req.method,
      originalUrl: req.originalUrl,
      plan: req.body.plan,
      userId: req.body.userId
    });
    
    const { plan, userId } = req.body;

    if (!userId) {
      logger.warn('Missing userId in request');
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    if (!plan) {
      logger.warn('Missing plan in request');
      return res.status(400).json({ 
        success: false, 
        error: 'plan is required' 
      });
    }

    // Получаем план подписки
    const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: plan }
    });
    
    logger.info('Subscription plan lookup', { 
      plan, 
      found: !!subscriptionPlan,
      planId: subscriptionPlan?.id 
    });
    
    if (!subscriptionPlan) {
      logger.error('Subscription plan not found', { plan });
      return res.status(400).json({ 
        success: false, 
        error: 'Subscription plan not found' 
      });
    }

    // Получаем пользователя
    // userId может быть в формате 'tg_123456789' или MongoDB ObjectID
    let user;
    
    if (userId.startsWith('tg_')) {
      // Извлекаем telegramId из строки 'tg_123456789'
      const telegramId = parseInt(userId.replace('tg_', ''), 10);
      logger.info('Extracted telegramId from userId', { userId, telegramId });
      
      user = await prisma.user.findUnique({
        where: { telegramId }
      });
      
      // Если пользователя нет - создаём его
      if (!user) {
        logger.info('Creating new user', { telegramId });
        user = await prisma.user.create({
          data: {
            telegramId,
            username: `user_${telegramId}`,
            tokens: 0
          }
        });
        logger.info('New user created', { userId: user.id, telegramId });
      }
    } else {
      // Пытаемся найти по MongoDB ObjectID
      user = await prisma.user.findUnique({
        where: { id: userId }
      });
    }

    if (!user) {
      logger.error('User not found', { userId });
      return res.status(400).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    logger.info('User found', { userId: user.id, telegramId: user.telegramId });

    // Создаем email для пользователя
    const userEmail = user.phone ? `${user.phone}@telegram.user` : `user${user.telegramId}@aicex.bot`;
    
    // URLs для success/fail
    const frontendUrl = process.env.FRONTEND_URL || 'https://aicexonefrontend-production.up.railway.app';
    const backendUrl = process.env.BACKEND_URL || 'https://aicexaibot-production.up.railway.app';
    
    // Данные для создания инвойса
    const invoiceData = {
      email: userEmail,
      offerId: subscriptionPlan.lavaOfferId,
      currency: 'RUB',
      description: `${subscriptionPlan.displayName} - AICEX AI Bot`,
      webhookUrl: `${backendUrl}/api/webhooks/lava`,
      successUrl: `${frontendUrl}/payment/success`,
      failUrl: `${frontendUrl}/payment/fail`
    };

    logger.info('🔍 LAVA API: Request data', {
      offerId: invoiceData.offerId,
      currency: invoiceData.currency,
      hasApiKey: !!process.env.LAVA_API_KEY,
      apiKeyLength: process.env.LAVA_API_KEY?.length || 0
    });

    // Безопасный запрос к LAVA Gate API
    const lavaResult = await createInvoiceSafe(invoiceData, logger);
    
    if (!lavaResult.ok) {
      logger.error('🚨 LAVA Gate error', {
        status: lavaResult.status,
        data: lavaResult.data,
        offerId: invoiceData.offerId
      });
      
      return res.status(502).json({
        success: false,
        error: "LAVA_GATEWAY_ERROR",
        lavaStatus: lavaResult.status,
        lavaData: lavaResult.data
      });
    }

    logger.info('✅ LAVA Gate success', {
      status: lavaResult.status,
      invoiceId: lavaResult.data.id
    });

    if (lavaResult.data.id && lavaResult.data.paymentUrl) {
      // Сохраняем информацию о платеже в БД
      await prisma.payment.create({
        data: {
          userId: user.id, // Используем MongoDB ObjectID
          amount: subscriptionPlan.priceRub,
          currency: 'RUB',
          status: 'PENDING',
          provider: 'lava',
          providerId: lavaResult.data.id,
          metadata: JSON.stringify({
            lavaInvoiceId: lavaResult.data.id,
            offerId: subscriptionPlan.lavaOfferId,
            userEmail: userEmail,
            plan: plan
          }) as any
        }
      });

      logger.info('✅ Payment created successfully', {
        userId: user.id,
        telegramId: user.telegramId,
        invoiceId: lavaResult.data.id,
        plan
      });

      return res.status(lavaResult.status).json({
        success: true,
        paymentId: lavaResult.data.id,
        paymentUrl: lavaResult.data.paymentUrl,
        status: lavaResult.data.status || 'PENDING'
      });
    } else {
      logger.error('❌ LAVA response missing required fields', {
        data: lavaResult.data
      });
      
      return res.status(502).json({
        success: false,
        error: 'Invalid response from payment provider'
      });
    }

  } catch (error) {
    logger.error('Lava controller exception', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
