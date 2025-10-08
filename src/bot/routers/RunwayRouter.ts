import { BotRouter } from "./BotRouter";
import { RunwayHandler } from "../handlers/runwayHandler";

export class RunwayRouter {
  private router: BotRouter;
  private handler: RunwayHandler;
  
  constructor(handler: RunwayHandler) {
    this.router = new BotRouter();
    this.handler = handler;
    this.registerRoutes();
  }
  
  private registerRoutes(): void {
    // Главное меню
    this.router.register("runway_back_to_main", ctx => this.handler.showMainMenu(ctx));
    
    // Основные функции
    this.router.register("runway_video_gen", ctx => this.handler.showVideoModels(ctx));
    this.router.register("runway_image_gen", ctx => this.handler.showImageModels(ctx));
    this.router.register("runway_editing", ctx => this.handler.showEditingMenu(ctx));
    this.router.register("runway_effects", ctx => this.handler.showEffectsMenu(ctx));
    this.router.register("runway_help", ctx => this.handler.showHelpMenu(ctx));
  }
  
  async handleCallback(ctx: any): Promise<boolean> {
    return await this.router.route(ctx);
  }
}
