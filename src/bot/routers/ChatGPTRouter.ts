import { BotRouter } from "./BotRouter";
import { ChatGPTHandler } from "../handlers/chatgptHandler";
import { logger } from "../../utils/logger";

export class ChatGPTRouter {
  private router: BotRouter;
  private handler: ChatGPTHandler;
  
  constructor(handler: ChatGPTHandler) {
    this.router = new BotRouter();
    this.handler = handler;
    this.registerRoutes();
  }
  
  private registerRoutes(): void {
    logger.info("🔧 Registering ChatGPT routes...");
    
    // Главное меню
    this.router.register("chatgpt_back_to_main", ctx => this.handler.showMainMenu(ctx));
    
    // Основные функции
    this.router.register("chatgpt_text_chat", ctx => this.handler.startTextChat(ctx));
    this.router.register("chatgpt_image_gen", ctx => this.handler.showImageGenMenu(ctx));
    this.router.register("chatgpt_image_analyze", ctx => this.handler.showImageAnalyzeMenu(ctx));
    
    // 📁 НОВОЕ: Обработка файлов
    this.router.register("chatgpt_file_processing", ctx => this.handler.showFileProcessingMenu(ctx));
    this.router.register("chatgpt_file_document", ctx => this.handler.startDocumentAnalysis(ctx));
    this.router.register("chatgpt_file_audio", ctx => this.handler.startAudioTranscription(ctx));
    
    // Настройки
    this.router.register("chatgpt_model_settings", ctx => this.handler.showModelsMenu(ctx));
    
    // Выбор моделей
    this.router.register("chatgpt_model_gpt-4o", ctx => this.handler.selectModel(ctx, "gpt-4o"));
    this.router.register("chatgpt_model_gpt-4o-mini", ctx => this.handler.selectModel(ctx, "gpt-4o-mini"));
    this.router.register("chatgpt_model_gpt-4-turbo", ctx => this.handler.selectModel(ctx, "gpt-4-turbo"));
    this.router.register("chatgpt_model_gpt-4", ctx => this.handler.selectModel(ctx, "gpt-4"));
    this.router.register("chatgpt_model_gpt-3.5-turbo", ctx => this.handler.selectModel(ctx, "gpt-3.5-turbo"));
    
    // DALL-E модели
    this.router.register("chatgpt_dalle_3", ctx => this.handler.selectImageModel(ctx, "dall-e-3"));
    this.router.register("chatgpt_dalle_2", ctx => this.handler.selectImageModel(ctx, "dall-e-2"));
    
    logger.info(`✅ ChatGPT routes registered: ${this.router.getHandlerCount()}`);
  }
  
  async handleCallback(ctx: any): Promise<boolean> {
    const data = ctx.callbackQuery?.data;
    logger.info(`🔘 ChatGPT router handling: ${data} from user ${ctx.from?.id}`);
    
    const handled = await this.router.route(ctx);
    
    if (handled) {
      logger.info(`✅ ChatGPT callback handled: ${data}`);
    } else {
      logger.warn(`❌ ChatGPT callback NOT handled: ${data}`);
    }
    
    return handled;
  }
}
