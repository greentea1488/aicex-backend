/// <reference path="./types.d.ts" />

// Мокаем переменные окружения для тестов
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test_bot_token';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test_db';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Мокаем внешние сервисы
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    info: jest.fn(),
    flushdb: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    connect: jest.fn()
  }));
});

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getWaiting: jest.fn().mockResolvedValue([] as any[]),
    getActive: jest.fn().mockResolvedValue([] as any[]),
    getCompleted: jest.fn().mockResolvedValue([] as any[]),
    getFailed: jest.fn().mockResolvedValue([] as any[]),
    clean: jest.fn(),
    close: jest.fn()
  }));
});

// Мокаем Prisma клиент
jest.mock('../src/utils/prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    freepikTask: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    midjourneyTask: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    runwayTask: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    tokenHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn()
  }
}));

// Мокаем логгер
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Глобальные утилиты для тестов
global.createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  telegramId: 123456789,
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  tokens: 100,
  subscription: 'base',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

global.createMockTask = (overrides = {}) => ({
  id: 'test-task-id',
  taskId: 'freepik_test_task',
  userId: 'test-user-id',
  prompt: 'test prompt',
  model: 'realism',
  type: 'image',
  status: 'pending',
  cost: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
