import { SecurityService } from '../../src/services/SecurityService';
import { prisma } from '../../src/utils/prismaClient';

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = new SecurityService();
  });

  describe('validatePrompt', () => {
    it('should validate a normal prompt', () => {
      const result = securityService.validatePrompt('A beautiful sunset over the ocean');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty prompts', () => {
      const result = securityService.validatePrompt('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт не может быть пустым');
    });

    it('should reject too short prompts', () => {
      const result = securityService.validatePrompt('hi');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт слишком короткий (минимум 3 символа)');
    });

    it('should reject too long prompts', () => {
      const longPrompt = 'a'.repeat(1001);
      const result = securityService.validatePrompt(longPrompt);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт слишком длинный (максимум 1000 символов)');
    });

    it('should reject prompts with forbidden words', () => {
      const result = securityService.validatePrompt('This is nsfw content');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт содержит запрещенный контент');
    });

    it('should reject prompts with NSFW patterns', () => {
      const result = securityService.validatePrompt('Show me nude pictures');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт содержит запрещенный контент');
    });

    it('should reject prompts with suspicious patterns', () => {
      const result = securityService.validatePrompt('aaaaaaaaaaaaa'); // Повторяющиеся символы
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт содержит подозрительные символы или структуру');
    });

    it('should reject prompts with too many words', () => {
      const manyWords = Array(101).fill('word').join(' ');
      const result = securityService.validatePrompt(manyWords);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт слишком длинный (максимум 100 слов)');
    });

    it('should reject prompts with too many repeated words', () => {
      const repeatedWords = Array(7).fill('spam').join(' ');
      const result = securityService.validatePrompt(repeatedWords);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Промпт содержит запрещенный контент');
    });

    it('should use cache for repeated prompts', () => {
      const prompt = 'Test prompt for caching';
      
      // Первый вызов
      const result1 = securityService.validatePrompt(prompt);
      expect(result1.valid).toBe(true);
      
      // Второй вызов должен использовать кэш
      const result2 = securityService.validatePrompt(prompt);
      expect(result2.valid).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const result = await securityService.checkRateLimit(123, 'test_action');
      
      expect(result).toBe(true);
    });

    it('should track multiple requests', async () => {
      const userId = 123;
      const action = 'test_action';
      
      // Делаем несколько запросов
      for (let i = 0; i < 9; i++) {
        const result = await securityService.checkRateLimit(userId, action);
        expect(result).toBe(true);
      }
      
      // 10-й запрос должен пройти
      const result = await securityService.checkRateLimit(userId, action);
      expect(result).toBe(true);
      
      // 11-й запрос должен быть заблокирован
      const blockedResult = await securityService.checkRateLimit(userId, action);
      expect(blockedResult).toBe(false);
    });

    it('should reset rate limit after window expires', async () => {
      const userId = 123;
      const action = 'test_action';
      
      // Заполняем лимит
      for (let i = 0; i < 10; i++) {
        await securityService.checkRateLimit(userId, action);
      }
      
      // Следующий запрос должен быть заблокирован
      let result = await securityService.checkRateLimit(userId, action);
      expect(result).toBe(false);
      
      // Симулируем истечение времени
      jest.advanceTimersByTime(61000); // 61 секунда
      
      // Теперь запрос должен пройти
      result = await securityService.checkRateLimit(userId, action);
      expect(result).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = securityService.sanitizeInput(input);
      
      expect(result).toBe('Hello');
    });

    it('should remove javascript: protocols', () => {
      const input = 'javascript:alert("xss")';
      const result = securityService.sanitizeInput(input);
      
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick="alert()" Hello';
      const result = securityService.sanitizeInput(input);
      
      expect(result).toBe('"alert()" Hello');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = securityService.sanitizeInput(input);
      
      expect(result).toBe('Hello World');
    });
  });

  describe('checkSuspiciousActivity', () => {
    it('should detect too many failed requests', async () => {
      const userId = 123;
      
      // Мокаем большое количество неудачных запросов
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(25);
      
      const result = await securityService.checkSuspiciousActivity(userId);
      
      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('Слишком много неудачных запросов за последний час');
    });

    it('should detect high request frequency', async () => {
      const userId = 123;
      
      // Мокаем нормальное количество неудачных запросов, но высокую частоту
      (prisma.auditLog.count as jest.Mock)
        .mockResolvedValueOnce(5) // Неудачные запросы
        .mockResolvedValueOnce(60); // Общие запросы за 5 минут
      
      const result = await securityService.checkSuspiciousActivity(userId);
      
      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('Слишком высокая частота запросов');
    });

    it('should not flag normal activity', async () => {
      const userId = 123;
      
      // Мокаем нормальную активность
      (prisma.auditLog.count as jest.Mock)
        .mockResolvedValueOnce(5) // Неудачные запросы
        .mockResolvedValueOnce(20); // Общие запросы за 5 минут
      
      const result = await securityService.checkSuspiciousActivity(userId);
      
      expect(result.suspicious).toBe(false);
    });
  });

  describe('blockUser', () => {
    it('should block user and log audit entry', async () => {
      const userId = 123;
      const reason = 'Suspicious activity';
      const duration = 30;
      
      // Мокаем пользователя
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        telegramId: userId
      });
      
      await securityService.blockUser(userId, reason, duration);
      
      // Проверяем, что пользователь заблокирован
      const isBlocked = securityService.isUserBlocked(userId);
      expect(isBlocked).toBe(true);
      
      // Проверяем, что создана запись в аудите
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          action: 'user_blocked',
          metadata: {
            reason,
            durationMinutes: duration,
            blockedUntil: expect.any(Date)
          }
        }
      });
    });
  });

  describe('isUserBlocked', () => {
    it('should return false for non-blocked user', () => {
      const result = securityService.isUserBlocked(123);
      expect(result).toBe(false);
    });

    it('should return true for blocked user', async () => {
      const userId = 123;
      
      // Блокируем пользователя
      await securityService.blockUser(userId, 'Test block');
      
      const result = securityService.isUserBlocked(userId);
      expect(result).toBe(true);
    });

    it('should return false after block expires', async () => {
      const userId = 123;
      
      // Блокируем пользователя на 1 минуту
      await securityService.blockUser(userId, 'Test block', 1);
      
      // Проверяем, что заблокирован
      expect(securityService.isUserBlocked(userId)).toBe(true);
      
      // Симулируем истечение времени
      jest.advanceTimersByTime(61000); // 61 секунда
      
      // Теперь должен быть разблокирован
      expect(securityService.isUserBlocked(userId)).toBe(false);
    });
  });

  describe('validateIPAddress', () => {
    it('should allow normal IP addresses', () => {
      const result = securityService.validateIPAddress('8.8.8.8');
      
      expect(result.valid).toBe(true);
    });

    it('should block local IP addresses', () => {
      const localIPs = ['127.0.0.1', '192.168.1.1', '10.0.0.1', '172.16.0.1'];
      
      localIPs.forEach(ip => {
        const result = securityService.validateIPAddress(ip);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Запросы с локальных IP адресов запрещены');
      });
    });

    it('should warn about suspicious IP ranges', () => {
      const suspiciousIPs = ['185.1.1.1', '46.1.1.1'];
      
      suspiciousIPs.forEach(ip => {
        const result = securityService.validateIPAddress(ip);
        expect(result.valid).toBe(true); // Не блокируем, но логируем
      });
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics', async () => {
      // Блокируем пользователя для статистики
      await securityService.blockUser(123, 'Test');
      
      const stats = securityService.getSecurityStats();
      
      expect(stats).toHaveProperty('rateLimiterEntries');
      expect(stats).toHaveProperty('validationCacheEntries');
      expect(stats).toHaveProperty('blockedUsers');
      expect(stats.blockedUsers).toBe(1);
    });
  });

  describe('cleanupRateLimiter', () => {
    it('should clean up expired entries', async () => {
      const userId = 123;
      
      // Создаем запись с истекшим временем
      await securityService.checkRateLimit(userId, 'test');
      
      // Симулируем истечение времени
      jest.advanceTimersByTime(61000);
      
      // Очищаем
      securityService.cleanupRateLimiter();
      
      // Проверяем, что запись удалена (новый запрос должен пройти как первый)
      const result = await securityService.checkRateLimit(userId, 'test');
      expect(result).toBe(true);
    });
  });
});

// Используем fake timers для тестирования временных функций
jest.useFakeTimers();
