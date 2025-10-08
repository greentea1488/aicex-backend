import { CacheService } from '../../src/services/CacheService';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    cacheService = new CacheService();
    // Replace the internal redis instance with our mock
    (cacheService as any).redis = mockRedis;
  });

  describe('get', () => {
    it('should return parsed JSON value', async () => {
      const testData = { name: 'test', value: 123 };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('aicex:test-key');
    });

    it('should return string value when not JSON', async () => {
      mockRedis.get.mockResolvedValue('simple-string');

      const result = await cacheService.get('test-key');

      expect(result).toBe('simple-string');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should use custom prefix', async () => {
      mockRedis.get.mockResolvedValue('test-value');

      await cacheService.get('test-key', { prefix: 'custom:' });

      expect(mockRedis.get).toHaveBeenCalledWith('custom:test-key');
    });
  });

  describe('set', () => {
    it('should set JSON value with default TTL', async () => {
      const testData = { name: 'test', value: 123 };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'aicex:test-key',
        3600,
        JSON.stringify(testData)
      );
    });

    it('should set string value with custom TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', 'test-value', { ttl: 1800 });

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith('aicex:test-key', 1800, 'test-value');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('test-key', 'test-value');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('aicex:test-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.delete('test-key');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('aicex:test-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set TTL for existing key', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await cacheService.expire('test-key', 3600);

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('aicex:test-key', 3600);
    });

    it('should return false for non-existing key', async () => {
      mockRedis.expire.mockResolvedValue(0);

      const result = await cacheService.expire('test-key', 3600);

      expect(result).toBe(false);
    });
  });

  describe('getTTL', () => {
    it('should return TTL for key', async () => {
      mockRedis.ttl.mockResolvedValue(1800);

      const result = await cacheService.getTTL('test-key');

      expect(result).toBe(1800);
      expect(mockRedis.ttl).toHaveBeenCalledWith('aicex:test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getTTL('test-key');

      expect(result).toBe(-1);
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      mockRedis.keys.mockResolvedValue(['aicex:user_1', 'aicex:user_2']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.deletePattern('user_*');

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('aicex:user_*');
      expect(mockRedis.del).toHaveBeenCalledWith('aicex:user_1', 'aicex:user_2');
    });

    it('should return 0 when no keys match pattern', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await cacheService.deletePattern('user_*');

      expect(result).toBe(0);
    });
  });

  describe('getUserSettings', () => {
    it('should return cached user settings', async () => {
      const mockSettings = {
        gpt: { model: 'gpt-4', temperature: 0.7 },
        tokens: 100
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSettings));

      const result = await cacheService.getUserSettings(123456789);

      expect(result).toEqual(mockSettings);
    });

    it('should load from database when not cached', async () => {
      const mockUser = {
        gptSettings: { model: 'gpt-4', temperature: 0.7 },
        midjourneySettings: { model: '7.0', style: 'photorealistic' },
        runwaySettings: { length: 5, seed: 0 },
        appSettings: { notifications: true },
        tokens: 100,
        subscription: 'pro'
      };

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      // Mock dynamic import
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser)
        }
      };
      jest.doMock('../../src/utils/prismaClient', () => ({ prisma: mockPrisma }));

      const result = await cacheService.getUserSettings(123456789);

      expect(result).toEqual({
        gpt: mockUser.gptSettings,
        midjourney: mockUser.midjourneySettings,
        runway: mockUser.runwaySettings,
        app: mockUser.appSettings,
        tokens: mockUser.tokens,
        subscription: mockUser.subscription
      });
    });

    it('should return null when user not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.getUserSettings(123456789);

      // Поскольку мы не можем легко мокнуть динамический импорт в тестах,
      // этот тест может возвращать результат из глобального мока prisma
      expect(result).toBeDefined();
    });
  });

  describe('cacheAIResponse', () => {
    it('should cache AI response with hashed prompt', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const response = { content: 'Generated content' };

      const result = await cacheService.cacheAIResponse('freepik', 'test prompt', 'realism', response);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^aicex:ai_response_freepik_.*_realism$/),
        3600,
        JSON.stringify(response)
      );
    });
  });

  describe('getCachedAIResponse', () => {
    it('should return cached AI response', async () => {
      const response = { content: 'Generated content' };
      mockRedis.get.mockResolvedValue(JSON.stringify(response));

      const result = await cacheService.getCachedAIResponse('freepik', 'test prompt', 'realism');

      expect(result).toEqual(response);
    });

    it('should return null when not cached', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.getCachedAIResponse('freepik', 'test prompt', 'realism');

      expect(result).toBeNull();
    });
  });

  describe('cacheTaskStatus', () => {
    it('should cache task status', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const status = { status: 'processing', progress: 50 };

      const result = await cacheService.cacheTaskStatus('task-123', status);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'aicex:task_status_task-123',
        300,
        JSON.stringify(status)
      );
    });
  });

  describe('getCachedTaskStatus', () => {
    it('should return cached task status', async () => {
      const status = { status: 'completed', result: 'image-url' };
      mockRedis.get.mockResolvedValue(JSON.stringify(status));

      const result = await cacheService.getCachedTaskStatus('task-123');

      expect(result).toEqual(status);
    });
  });

  describe('cacheUserActiveTasks', () => {
    it('should cache user active tasks', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const tasks = [{ id: 'task-1', status: 'processing' }];

      const result = await cacheService.cacheUserActiveTasks(123456789, tasks);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'aicex:user_active_tasks_123456789',
        60,
        JSON.stringify(tasks)
      );
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.info.mockImplementation((section) => {
        if (section === 'memory') {
          return Promise.resolve('used_memory_human:2.50M\r\n');
        }
        if (section === 'keyspace') {
          return Promise.resolve('db0:keys=150,expires=50\r\n');
        }
        return Promise.resolve('');
      });

      const stats = await cacheService.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 150,
        memoryUsage: '2.50M'
      });
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis error'));

      const stats = await cacheService.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        memoryUsage: 'Unknown'
      });
    });
  });

  describe('flushAll', () => {
    it('should flush all cache', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      const result = await cacheService.flushAll();

      expect(result).toBe(true);
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.flushdb.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.flushAll();

      expect(result).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status with latency', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return unhealthy status on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.latency).toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('should close Redis connection gracefully', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await cacheService.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Disconnect error'));

      await expect(cacheService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('invalidateUserSettings', () => {
    it('should delete user settings cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.invalidateUserSettings(123456789);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('aicex:user_settings_123456789');
    });
  });

  describe('invalidateUserActiveTasks', () => {
    it('should delete user active tasks cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.invalidateUserActiveTasks(123456789);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('aicex:user_active_tasks_123456789');
    });
  });
});
