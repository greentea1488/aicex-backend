config(); // Load environment variables first
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import express from 'express';
import { logger } from './utils/logger';
import { prisma } from './utils/prismaClient';
import { subscriptionService } from './services/SubscriptionService';
import { setupCronJobs } from './utils/cronJobs';
import { startBot } from './bot/bot';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import generationRoutes from './routes/generation';
import webhookRoutes from './routes/webhooks';
import lavaTopRoutes from './routes/lavaTop';
import freepikRoutes from './routes/freepik';
const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [
    'https://aicexonefrontend-production.up.railway.app',
    'http://localhost:5173', // для разработки
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

const httpLogger = pinoHttp({
  logger,
  // Custom serializers for reduced verbosity
  serializers: {
    req: req => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      id: req.id,
    }),
    res: res => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Custom log levels
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `Request completed: ${req.method} ${req.url} [${res.statusCode}]`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `Request failed: ${req.method} ${req.url} [${res.statusCode}] - ${err.message}`;
  },

  // Custom additional properties
  customProps: (req, res) => ({
    userAgent: req.headers["user-agent"],
  }),
});
app.use(httpLogger);

// Загружаем все маршруты после исправления path-to-regexp ошибки
try {
  app.use("/api/auth", authRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/freepik", freepikRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/lava-top", lavaTopRoutes);
  app.use("/api/v1", apiRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/miniapp", miniappRoutes); // Mini App API routes
  logger.info("✅ All routes loaded successfully");
  
  // Детальная диагностика переменных окружения
  logger.info("🔍 Environment Variables Diagnostic:");
  logger.info(`🔑 FREEPIK_API_KEY: ${process.env.FREEPIK_API_KEY ? `EXISTS (${process.env.FREEPIK_API_KEY.substring(0, 10)}...)` : 'NOT FOUND'}`);
  logger.info(`🤖 OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? `EXISTS (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'NOT FOUND'}`);
  logger.info(`🎨 GEN_API_KEY: ${process.env.GEN_API_KEY ? `EXISTS (${process.env.GEN_API_KEY.substring(0, 10)}...)` : 'NOT FOUND'}`);
  logger.info(`🎬 RUNWAY_API_KEY: ${process.env.RUNWAY_API_KEY ? `EXISTS (${process.env.RUNWAY_API_KEY.substring(0, 10)}...)` : 'NOT FOUND'}`);
  logger.info(`💳 LAVA_API_KEY: ${process.env.LAVA_API_KEY ? `EXISTS (${process.env.LAVA_API_KEY.substring(0, 10)}...)` : 'NOT FOUND'}`);
  logger.info(`🗄️ DATABASE_URL: ${process.env.DATABASE_URL ? `EXISTS (${process.env.DATABASE_URL.substring(0, 20)}...)` : 'NOT FOUND'}`);
  logger.info(`🤖 BOT_TOKEN: ${process.env.BOT_TOKEN ? `EXISTS (${process.env.BOT_TOKEN.substring(0, 10)}...)` : 'NOT FOUND'}`);
  logger.info("🔍 End Environment Variables Diagnostic");
} catch (error) {
  throw error;
}

// Корневой маршрут - информация о API
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "AICEX AI Bot API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/ok",
      auth: "/api/auth/*",
      chat: "/api/chat/*", 
      user: "/api/user/*",
      ai_services: "/api/freepik/*",
      payments: "/api/payment/*",
      admin: "/api/admin/*",
      webhooks: "/api/webhooks/*"
    },
    documentation: "https://github.com/greentea1488/AICEX_ai_bot",
    telegram_bot: process.env.BOT_TOKEN ? "configured" : "not_configured",
    database: process.env.DATABASE_URL ? "configured" : "not_configured"
  });
});

app.get("/ok", async (req: Request, res: Response) => {
  try {
    const response: any = {
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "running"
    };

    // Проверяем подключение к базе данных только если DATABASE_URL доступен
    if (process.env.DATABASE_URL) {
      try {
        await prisma.$connect();
        response.database = "connected";
      } catch (dbError) {
        logger.warn("Database check failed in healthcheck:", dbError);
        response.database = "disconnected";
        response.database_error = dbError instanceof Error ? dbError.message : "Unknown database error";
      }
    } else {
      response.database = "not_configured";
    }

    res.status(200).json(response);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({ 
      status: "error", 
      timestamp: new Date().toISOString(),
      server: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  req.log.error(err);
});


app.listen(PORT, "0.0.0.0", async () => {
  try {
    logger.info(`Starting server on port ${PORT}...`);
    
    if (process.env.DATABASE_URL) {
      try {
        await prisma.$connect();
        logger.info("✅ Database connected successfully");
        
        // Принудительно создаем схему базы данных
        try {
          logger.info("🔄 Initializing database schema...");
          
          // Выполняем миграцию схемы (создает коллекции)
          await prisma.$runCommandRaw({
            createIndexes: "User",
            indexes: [
              {
                key: { telegramId: 1 },
                name: "telegramId_unique",
                unique: true
              }
            ]
          });
          
          await prisma.$runCommandRaw({
            createIndexes: "Task",
            indexes: [
              {
                key: { taskId: 1 },
                name: "taskId_unique", 
                unique: true
              }
            ]
          });
          
          logger.info("✅ Database indexes created");
          
          // Проверяем что база инициализирована
          const userCount = await prisma.user.count();
          logger.info(`📊 Users in database: ${userCount}`);
          
          // Создаем тестового пользователя если база пустая
          if (userCount === 0) {
            await prisma.user.create({
              data: {
                telegramId: 123456789,
                username: "test_user",
                firstName: "Test",
                lastName: "User",
                tokens: 10
              }
            });
            logger.info("✅ Test user created successfully");
          }

          // Инициализируем планы подписок
          try {
            await subscriptionService.initializeSubscriptionPlans();
            logger.info("✅ Subscription plans initialized successfully");
          } catch (planError: any) {
            logger.warn("Subscription plans initialization warning:", planError.message);
          }

          // Запускаем cron задачи
          try {
            setupCronJobs();
            logger.info("✅ Cron jobs started successfully");
          } catch (cronError: any) {
            logger.warn("Cron jobs initialization warning:", cronError.message);
          }
          
        } catch (initError: any) {
          logger.warn("Database initialization warning:", initError.message);
          
          // Пробуем создать пользователя напрямую (это создаст коллекцию)
          try {
            const userCount = await prisma.user.count();
            if (userCount === 0) {
              await prisma.user.create({
                data: {
                  telegramId: 123456789,
                  username: "test_user", 
                  firstName: "Test",
                  lastName: "User",
                  tokens: 10
                }
              });
              logger.info("✅ Database initialized with test user");
            }
          } catch (createError) {
            logger.error("Failed to initialize database:", createError);
          }
        }
        
      } catch (dbError: any) {
        logger.error("Database connection failed:", dbError.message);
      }
    } else {
      logger.warn("⚠️ DATABASE_URL not provided, database functionality will be limited");
    }
    
    // Запускаем бота асинхронно, не блокируя сервер
    if (process.env.BOT_TOKEN) {
      logger.info("🤖 Starting Telegram bot...");
      logger.info(`🔑 BOT_TOKEN available: ${process.env.BOT_TOKEN ? 'YES' : 'NO'}`);
      
      // Импортируем и запускаем чистого бота
      import('./bot/clean-production-bot')
        .then(({ startCleanBot }) => {
          return startCleanBot();
        })
        .then(() => {
          logger.info("✅ Telegram bot started successfully!");
        })
        .catch(error => {
          logger.error("❌ Failed to start bot, but server continues:");
          logger.error("Bot error details:", error);
          logger.error("Bot error stack:", error.stack);
        });
    } else {
      logger.warn("⚠️ BOT_TOKEN not provided, bot will not start");
    }
  } catch (e) {
    logger.error("❌ Failed to start server:");
    logger.error(e);
    process.exit(1);
  }
});
