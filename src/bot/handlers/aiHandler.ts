import { Context } from "grammy";
import { BaseAIService } from "../services/ai/BaseAIService";
import { ChatGPTService } from "../services/ai/ChatGPTService";
import { KlingService } from "../services/ai/KlingService";
import { FreepikLoraService } from "../services/ai/FreepikLoraService";
import { RunwayService } from "../services/ai/RunwayService";
import { SessionManager } from "../services/SessionManager";
import { prisma } from "../../utils/prismaClient";

export class AIHandler {
  private sessionManager = new SessionManager();
  private aiServices = new Map<string, BaseAIService>();

  constructor() {
    // Register AI services
    this.aiServices.set("chatgpt", new ChatGPTService()); // ChatGPT with API key
    this.aiServices.set("kling", new KlingService());
    this.aiServices.set("freepik", new FreepikLoraService());
    this.aiServices.set("runway", new RunwayService());
  }

  async handleAISelection(ctx: Context, aiProvider: string) {
    const userId = ctx.from?.id.toString();
    if (!userId) {
      await ctx.reply("❌ Не удалось определить пользователя.");
      return;
    }

    // Check if AI service exists
    const aiService = this.aiServices.get(aiProvider);
    if (!aiService) {
      await ctx.reply("❌ Выбранный AI сервис недоступен.");
      return;
    }

    // Validate AI service configuration
    if (!aiService.validateConfig()) {
      await ctx.reply("❌ AI сервис не настроен.");
      return;
    }

    try {
      // Get or create user
      const user = await this.getOrCreateUser(parseInt(userId), ctx.from?.username!);

      // Try to load existing session first
      let session = await this.sessionManager.loadChatSession(userId, aiProvider);

      if (!session) {
        // Create new session
        session = this.sessionManager.createSession(userId, aiProvider);

        // Add system prompt to new session
        if (user.gptSettings?.systemPrompt) {
          session.messages.push({
            role: "system",
            content: user.gptSettings?.systemPrompt,
          });
        }

        if (user.gptSettings?.userPrompt) {
          session.messages.push({
            role: "system",
            content: user.gptSettings?.userPrompt,
          });
        }
      }

      await ctx.reply(`🤖 Вы начали разговор с ${aiService.getName()}.\n\n` + `💬 Отправьте сообщение для начала диалога\n` + `🛑 Напишите "STOP" для завершения разговора`);
    } catch (error) {
      console.error("Error handling AI selection:", error);
      await ctx.reply("❌ Произошла ошибка при запуске AI сервиса. Попробуйте позже.");
    }
  }

  async handleMessage(ctx: Context) {
    const userId = ctx.from?.id.toString();
    const message = ctx.message?.text;

    if (!userId || !message) return;

    // Ensure user exists in database
    await this.getOrCreateUser(parseInt(userId), ctx.from?.username || `user_${userId}`);

    const session = this.sessionManager.getSession(userId);
    if (!session || !session.isActive) {
      // No active session, ignore the message
      return;
    }

    // Check for STOP command
    if (message.toUpperCase() === "STOP") {
      await this.endSession(ctx, userId);
      return;
    }

    // Show typing indicator
    await ctx.replyWithChatAction("typing");

    try {
      // Add user message to session
      session.messages.push({
        role: "user",
        content: message.trim(),
      });

      // Get AI service and generate response
      const aiService = this.aiServices.get(session.aiProvider);
      if (!aiService) {
        await ctx.reply("❌ AI сервис недоступен.");
        return;
      }

      const response = await aiService.chat(session.messages, userId);

      // Add AI response to session
      session.messages.push({
        role: "assistant",
        content: response.content,
      });

      // Save session to database
      await this.sessionManager.saveChatSession(session);

      // Send response to user
      await ctx.reply(response.content);

      // Optional: Show token usage for premium users
      if (response.usage && response.usage.totalTokens > 0) {
        const user = await prisma.user.findUnique({
          where: { telegramId: parseInt(userId) },
        });

        if (user?.subscription === "premium") {
          await ctx.reply(`📊 Использовано токенов: ${response.usage.totalTokens}`, { reply_to_message_id: ctx.message?.message_id });
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      await ctx.reply("❌ Произошла ошибка при обработке запроса. Попробуйте еще раз.\n\n" + "Если проблема повторяется, напишите 'STOP' для завершения разговора.");
    }
  }

  private async endSession(ctx: Context, userId: string) {
    const session = this.sessionManager.getSession(userId);

    if (session) {
      // Save final session state
      session.isActive = false;
      await this.sessionManager.saveChatSession(session);

      // End session
      this.sessionManager.endSession(userId);

      await ctx.reply("✅ Разговор завершен.\n\n" + "Используйте /start для возврата в главное меню.");
    } else {
      await ctx.reply("ℹ️ У вас нет активного разговора.");
    }
  }

  private async getOrCreateUser(telegramId: number, username: string) {
    try {
      // Try to find existing user
      let user = await prisma.user.findUnique({
        where: { telegramId },
      });

      if (!user) {
        // Create new user with default settings
        user = await prisma.user.create({
          data: {
            telegramId: telegramId,
            username: username,
            tokens: 1000, // Starting tokens
            friendsReferred: 0,
            runwaySettings: {},
            midjourneySettings: {},
            gptSettings: { model: "gpt-4.1-mini" }, // Set correct default model
            appSettings: {},
          },
        });
      }

      return user;
    } catch (error) {
      console.error("Error getting or creating user:", error);
      throw error;
    }
  }

  // Get active session info for a user
  getActiveSession(userId: string) {
    return this.sessionManager.getSession(userId);
  }

  // Check if user has active session
  hasActiveSession(userId: string): boolean {
    const session = this.sessionManager.getSession(userId);
    return session?.isActive || false;
  }

  // Get available AI services
  getAvailableServices(): string[] {
    return Array.from(this.aiServices.keys());
  }

  // Cleanup inactive sessions (can be called periodically)
  cleanupSessions() {
    this.sessionManager.cleanupInactiveSessions(30); // 30 minutes timeout
  }
}
