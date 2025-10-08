import { TokenService } from '../../src/services/TokenService';
import { prisma } from '../../src/utils/prismaClient';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('checkTokenBalance', () => {
    it('should return true when user has enough tokens', async () => {
      const mockUser = global.createMockUser({ tokens: 100 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await tokenService.checkTokenBalance(123456789, 50);

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 },
        select: { tokens: true }
      });
    });

    it('should return false when user has insufficient tokens', async () => {
      const mockUser = global.createMockUser({ tokens: 30 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await tokenService.checkTokenBalance(123456789, 50);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tokenService.checkTokenBalance(123456789, 50);

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await tokenService.checkTokenBalance(123456789, 50);

      expect(result).toBe(false);
    });
  });

  describe('deductTokens', () => {
    it('should successfully deduct tokens', async () => {
      const mockUser = global.createMockUser({ tokens: 100 });
      const updatedUser = { ...mockUser, tokens: 90 };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(updatedUser)
          },
          tokenHistory: {
            create: jest.fn().mockResolvedValue({})
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        });
      });

      const result = await tokenService.deductTokens(123456789, 10, 'freepik', { test: true });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(90);
    });

    it('should fail when user has insufficient tokens', async () => {
      const mockUser = global.createMockUser({ tokens: 5 });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser)
          }
        });
      });

      const result = await tokenService.deductTokens(123456789, 10, 'freepik');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Недостаточно токенов. Требуется: 10, доступно: 5');
    });

    it('should fail when user not found', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(null)
          }
        });
      });

      const result = await tokenService.deductTokens(123456789, 10, 'freepik');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Пользователь не найден');
    });

    it('should handle transaction errors', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      const result = await tokenService.deductTokens(123456789, 10, 'freepik');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ошибка при списании токенов');
    });
  });

  describe('addTokens', () => {
    it('should successfully add tokens', async () => {
      const mockUser = global.createMockUser({ tokens: 50 });
      const updatedUser = { ...mockUser, tokens: 100 };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(updatedUser)
          },
          tokenHistory: {
            create: jest.fn().mockResolvedValue({})
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        });
      });

      const result = await tokenService.addTokens(123456789, 50, 'purchase', { orderId: '123' });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(100);
    });

    it('should fail when user not found', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(null)
          }
        });
      });

      const result = await tokenService.addTokens(123456789, 50, 'purchase');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Пользователь не найден');
    });
  });

  describe('refundTokens', () => {
    it('should successfully refund tokens', async () => {
      const mockUser = global.createMockUser({ tokens: 50 });
      const updatedUser = { ...mockUser, tokens: 60 };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(updatedUser)
          },
          tokenHistory: {
            create: jest.fn().mockResolvedValue({})
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        });
      });

      const result = await tokenService.refundTokens(123456789, 10, 'freepik', 'Task failed');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(60);
    });
  });

  describe('getTokenBalance', () => {
    it('should return user token balance', async () => {
      const mockUser = global.createMockUser({ tokens: 75 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const balance = await tokenService.getTokenBalance(123456789);

      expect(balance).toBe(75);
    });

    it('should return null when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const balance = await tokenService.getTokenBalance(123456789);

      expect(balance).toBeNull();
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const balance = await tokenService.getTokenBalance(123456789);

      expect(balance).toBeNull();
    });
  });

  describe('getTokenHistory', () => {
    it('should return user token history', async () => {
      const mockUser = global.createMockUser();
      const mockHistory = [
        { amount: -10, type: 'deduction', createdAt: new Date() },
        { amount: 50, type: 'addition', createdAt: new Date() }
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.tokenHistory.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const history = await tokenService.getTokenHistory(123456789, 5);

      expect(history).toEqual(mockHistory);
      expect(prisma.tokenHistory.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          amount: true,
          type: true,
          createdAt: true
        }
      });
    });

    it('should return null when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const history = await tokenService.getTokenHistory(123456789);

      expect(history).toBeNull();
    });
  });

  describe('getServiceCost', () => {
    it('should return correct costs for different services', () => {
      expect(tokenService.getServiceCost('freepik', 'image_generation')).toBe(5);
      expect(tokenService.getServiceCost('freepik', 'video_generation')).toBe(15);
      expect(tokenService.getServiceCost('midjourney', 'image_generation')).toBe(10);
      expect(tokenService.getServiceCost('chatgpt', 'text_generation')).toBe(1);
      expect(tokenService.getServiceCost('chatgpt', 'image_generation')).toBe(8);
      expect(tokenService.getServiceCost('runway', 'video_generation')).toBe(20);
    });

    it('should return default cost for unknown service/operation', () => {
      expect(tokenService.getServiceCost('unknown', 'unknown')).toBe(1);
    });
  });

  describe('createTaskWithTokenDeduction', () => {
    it('should create freepik task with token deduction', async () => {
      const mockUser = global.createMockUser({ tokens: 100 });
      const mockTask = global.createMockTask();

      // Mock successful token deduction
      jest.spyOn(tokenService, 'deductTokens').mockResolvedValue({
        success: true,
        newBalance: 95
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.freepikTask.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await tokenService.createTaskWithTokenDeduction(
        123456789,
        'freepik',
        'image_generation',
        { prompt: 'test prompt', model: 'realism', type: 'image' }
      );

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(tokenService.deductTokens).toHaveBeenCalledWith(
        123456789,
        5,
        'freepik',
        expect.any(Object)
      );
    });

    it('should fail when token deduction fails', async () => {
      jest.spyOn(tokenService, 'deductTokens').mockResolvedValue({
        success: false,
        error: 'Недостаточно токенов'
      });

      const result = await tokenService.createTaskWithTokenDeduction(
        123456789,
        'freepik',
        'image_generation',
        { prompt: 'test prompt', model: 'realism' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Недостаточно токенов');
    });

    it('should refund tokens when task creation fails', async () => {
      const mockUser = global.createMockUser({ tokens: 100 });

      jest.spyOn(tokenService, 'deductTokens').mockResolvedValue({
        success: true,
        newBalance: 95
      });
      jest.spyOn(tokenService, 'refundTokens').mockResolvedValue({
        success: true,
        newBalance: 100
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.freepikTask.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await tokenService.createTaskWithTokenDeduction(
        123456789,
        'freepik',
        'image_generation',
        { prompt: 'test prompt', model: 'realism' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ошибка создания задачи');
      expect(tokenService.refundTokens).toHaveBeenCalledWith(
        123456789,
        5,
        'freepik',
        'Task creation failed'
      );
    });

    it('should handle unknown service', async () => {
      jest.spyOn(tokenService, 'deductTokens').mockResolvedValue({
        success: true,
        newBalance: 99
      });
      jest.spyOn(tokenService, 'refundTokens').mockResolvedValue({
        success: true,
        newBalance: 100
      });

      const result = await tokenService.createTaskWithTokenDeduction(
        123456789,
        'unknown' as any,
        'image_generation',
        { prompt: 'test prompt' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Неизвестный AI сервис');
      expect(tokenService.refundTokens).toHaveBeenCalled();
    });

    it('should create midjourney task correctly', async () => {
      const mockUser = global.createMockUser({ tokens: 100 });
      const mockTask = { ...global.createMockTask(), taskId: 'midjourney_test' };

      jest.spyOn(tokenService, 'deductTokens').mockResolvedValue({
        success: true,
        newBalance: 90
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.midjourneyTask.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await tokenService.createTaskWithTokenDeduction(
        123456789,
        'midjourney',
        'image_generation',
        { 
          prompt: 'test prompt', 
          model: '7.0', 
          style: 'photorealistic',
          aspect_ratio: '1:1',
          quality: 'high'
        }
      );

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('midjourney_test');
      expect(prisma.midjourneyTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          telegramId: 123456789,
          prompt: 'test prompt',
          model: '7.0',
          style: 'photorealistic',
          aspect_ratio: '1:1',
          quality: 'high',
          cost: 10
        })
      });
    });

    it('should create runway task correctly', async () => {
      const mockUser = global.createMockUser({ tokens: 100 });
      const mockTask = { ...global.createMockTask(), taskId: 'runway_test' };

      jest.spyOn(tokenService, 'deductTokens').mockResolvedValue({
        success: true,
        newBalance: 80
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.runwayTask.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await tokenService.createTaskWithTokenDeduction(
        123456789,
        'runway',
        'video_generation',
        { 
          prompt: 'test video prompt', 
          model: 'gen3',
          type: 'text_to_video'
        }
      );

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('runway_test');
      expect(prisma.runwayTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          prompt: 'test video prompt',
          model: 'gen3',
          type: 'text_to_video',
          cost: 20
        })
      });
    });
  });
});
