import { Context } from "grammy";
import { SessionManager } from "../services/SessionManager";
import { prisma } from "../../utils/prismaClient";
import { logger } from "../../utils/logger";

export abstract class BaseAIHandler {
  protected sessionManager: SessionManager;
  protected prisma: typeof prisma;
  protected logger: typeof logger;
  
  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.prisma = prisma;
    this.logger = logger;
  }
  
  /**
   * Валидирует пользователя
   */
  protected async validateUser(ctx: Context): Promise<any | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { telegramId: ctx.from!.id }
      });
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден');
        return null;
      }
      
      return user;
    } catch (error) {
      this.logger.error('Error validating user:', error);
      await ctx.reply('❌ Ошибка сервера');
      return null;
    }
  }
  
  /**
   * Унифицированная обработка ошибок
   */
  protected async handleError(ctx: Context, error: Error, operation: string): Promise<void> {
    this.logger.error(`Error in ${operation}:`, error);
    await ctx.reply(`❌ Ошибка ${operation}. Попробуйте позже.`);
  }
  
  /**
   * Проверяет активную сессию
   */
  protected hasActiveSession(userId: string): boolean {
    const session = this.sessionManager.getSession(userId);
    return session?.isActive || false;
  }
  
  /**
   * Завершает активную сессию
   */
  protected endSession(userId: string): void {
    this.sessionManager.endSession(userId);
  }
  
  /**
   * Отправляет ответ с обработкой ошибок
   */
  protected async safeReply(ctx: Context, text: string, options?: any): Promise<void> {
    try {
      await ctx.reply(text, options);
    } catch (error) {
      this.logger.error('Error sending reply:', error);
    }
  }
  
  /**
   * Редактирует сообщение с обработкой ошибок
   */
  protected async safeEditMessage(ctx: Context, text: string, options?: any): Promise<void> {
    try {
      await ctx.editMessageText(text, options);
    } catch (error) {
      this.logger.error('Error editing message:', error);
      // Fallback на обычный ответ
      await this.safeReply(ctx, text);
    }
  }
  
  /**
   * Абстрактные методы для реализации в наследниках
   */
  abstract showMainMenu(ctx: Context): Promise<void>;
  abstract handleCallback(ctx: Context, action: string): Promise<void>;
}
