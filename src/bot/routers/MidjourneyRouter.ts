import { BotRouter } from "./BotRouter";
import { MidjourneyHandler } from "../handlers/midjourneyHandler";

export class MidjourneyRouter {
  private router: BotRouter;
  private handler: MidjourneyHandler;
  
  constructor(handler: MidjourneyHandler) {
    this.router = new BotRouter();
    this.handler = handler;
    this.registerRoutes();
  }
  
  private registerRoutes(): void {
    // Главное меню
    this.router.register("midjourney_back_to_main", ctx => this.handler.showMainMenu(ctx));
    
    // Основные функции
    this.router.register("midjourney_generate", ctx => this.handler.startGenerationSession(ctx));
    this.router.register("midjourney_settings", ctx => this.handler.showSettingsMenu(ctx));
    this.router.register("midjourney_history", ctx => this.handler.showHistory(ctx));
    this.router.register("midjourney_help", ctx => this.handler.showHelpMenu(ctx));
  }
  
  async handleCallback(ctx: any): Promise<boolean> {
    return await this.router.route(ctx);
  }
}
