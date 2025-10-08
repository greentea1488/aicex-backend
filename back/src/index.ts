// Самое первое логирование - чтобы убедиться что файл вообще загружается
console.log("=".repeat(80));
console.log("🔥 INDEX.TS LOADING... 🔥");
console.log("=".repeat(80));

import { config } from "dotenv";
config(); // Load environment variables first

console.log("✅ dotenv loaded");

import fs from "node:fs";
import path from "node:path";

console.log("✅ node modules loaded");

import cors from "cors";

console.log("✅ cors loaded");

import type { NextFunction, Request, Response } from "express";
import express from "express";

console.log("✅ express loaded");

import pino from "pino";
import pinoHttp from "pino-http";

console.log("✅ pino loaded");
// Импортируем все маршруты после исправления
import authRoutes from "./routes/auth";
console.log("✅ authRoutes loaded");
import chatRoutes from "./routes/chat";
console.log("✅ chatRoutes loaded");
import userRoutes from "./routes/user";
console.log("✅ userRoutes loaded");
import paymentRoutes from "./routes/payment";
console.log("✅ paymentRoutes loaded");
import apiRoutes from "./routes/api";
console.log("✅ apiRoutes loaded");
import adminRoutes from "./routes/admin";
console.log("✅ adminRoutes loaded");
import webhookRoutes from "./routes/webhooks";
console.log("✅ webhookRoutes loaded");
import freepikRoutes from "./routes/freepik";
console.log("✅ freepikRoutes loaded");
import { logger } from "./utils/logger";
console.log("✅ logger loaded");
import { prisma } from "./utils/prismaClient";
console.log("✅ prisma loaded");
import { startBot } from "./bot/production-bot";
console.log("✅ startBot loaded");
import { 
  globalLimiter, 
  authLimiter, 
  paymentLimiter, 
  aiGenerationLimiter,
  webhookLimiter 
} from "./middlewares/rateLimiter";
console.log("✅ rate limiters loaded");

console.log("=".repeat(80));
console.log("🎉 ALL IMPORTS SUCCESSFUL! CREATING EXPRESS APP... 🎉");
console.log("=".repeat(80));

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

console.log(`✅ Express app created, PORT: ${PORT}`);

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [
    'https://aicexonefrontend-production.up.railway.app',
    'http://localhost:5173', // для разработки
    process.env.FRONTEND_URL
  ].filter((url): url is string => Boolean(url)),
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

// Загружаем все маршруты с rate limiting
try {
  // Auth routes - строгий лимит
  app.use("/api/auth", authLimiter.middleware(), authRoutes);
  
  // Chat и AI генерация - средний лимит
  app.use("/api/chat", aiGenerationLimiter.middleware(), chatRoutes);
  app.use("/api/freepik", aiGenerationLimiter.middleware(), freepikRoutes);
  
  // Payment routes - средний лимит
  app.use("/api/payment", paymentLimiter.middleware(), paymentRoutes);
  app.use("/api/payments", paymentLimiter.middleware(), paymentRoutes);
  
  // Webhooks - высокий лимит (для внешних сервисов)
  app.use("/api/webhooks", webhookLimiter.middleware(), webhookRoutes);
  
  // Остальные routes - стандартный лимит
  app.use("/api/user", globalLimiter.middleware(), userRoutes);
  app.use("/api", globalLimiter.middleware(), apiRoutes);
  app.use("/api/admin", globalLimiter.middleware(), adminRoutes);
  
  logger.info("✅ All routes loaded with rate limiting");
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

// Простейший healthcheck endpoint - должен быть первым
app.get("/ok", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok", 
    timestamp: new Date().toISOString(),
    server: "running"
  });
});

// Дополнительный healthcheck с проверкой БД
app.get("/health", async (req: Request, res: Response) => {
  try {
    const response: any = {
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "running",
      port: PORT
    };

    // Проверяем подключение к базе данных с таймаутом
    if (process.env.DATABASE_URL) {
      try {
        // Создаем Promise с таймаутом 5 секунд
        const dbCheck = Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database connection timeout')), 5000)
          )
        ]);
        
        await dbCheck;
        response.database = "connected";
      } catch (dbError) {
        logger.warn("Database check failed in healthcheck:", dbError);
        response.database = "disconnected";
        response.database_error = dbError instanceof Error ? dbError.message : "Unknown database error";
        // Не возвращаем ошибку 500, просто отмечаем что БД недоступна
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

// Global error handler - MUST be after all routes
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  req.log.error(err, 'Unhandled error in request');
  
  // Если headers уже отправлены, передаём ошибку дальше
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


// Global error handlers
function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString()
    });
    // Don't exit process in production, but log it
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.fatal('Uncaught Exception - shutting down', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    try {
      // Close database connection
      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      // Exit process
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Логируем перед запуском сервера
logger.info("=".repeat(60));
logger.info("🚀 STARTING SERVER...");
logger.info(`📍 Port: ${PORT}`);
logger.info(`🌍 Host: 0.0.0.0`);
logger.info(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
logger.info(`💾 DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);
logger.info(`🤖 BOT_TOKEN: ${process.env.BOT_TOKEN ? 'configured' : 'NOT SET'}`);
logger.info("=".repeat(60));

app.listen(PORT, "0.0.0.0", () => {
  logger.info("=".repeat(60));
  logger.info("✅ SERVER SUCCESSFULLY STARTED!");
  logger.info(`📍 Listening on: http://0.0.0.0:${PORT}`);
  logger.info(`🏥 Healthcheck: http://0.0.0.0:${PORT}/ok`);
  logger.info(`🔍 Health details: http://0.0.0.0:${PORT}/health`);
  logger.info("=".repeat(60));
  
  // Setup global error handlers
  setupGlobalErrorHandlers();
  
  // Запускаем инициализацию БД асинхронно, не блокируя сервер
  (async () => {
    if (process.env.DATABASE_URL) {
      try {
        logger.info("🔄 Connecting to database...");
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
        logger.warn("⚠️ Server continues without database");
      }
    } else {
      logger.warn("⚠️ DATABASE_URL not provided, database functionality will be limited");
    }
    
    // Запускаем бота асинхронно, не блокируя сервер
    if (process.env.BOT_TOKEN) {
      logger.info("🤖 Starting Telegram bot...");
      logger.info(`🔑 BOT_TOKEN available: ${process.env.BOT_TOKEN ? 'YES' : 'NO'}`);
      
      startBot()
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
  })().catch(error => {
    logger.error("❌ Initialization error (server continues):", error);
  });
}).on('error', (error) => {
  logger.fatal("❌❌❌ FAILED TO START SERVER ❌❌❌");
  logger.fatal("Error:", error);
  logger.fatal("Stack:", error.stack);
  process.exit(1);
});
