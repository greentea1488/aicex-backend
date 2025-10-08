import { BotRouter } from "./BotRouter";
import { FreepikHandler } from "../handlers/freepikHandler";

export class FreepikRouter {
  private router: BotRouter;
  private handler: FreepikHandler;
  
  constructor(handler: FreepikHandler) {
    this.router = new BotRouter();
    this.handler = handler;
    this.registerRoutes();
  }
  
  private registerRoutes(): void {
    // Главное меню
    this.router.register("freepik_back_to_main", ctx => this.handler.showMainMenu(ctx));
    
    // Основные функции
    this.router.register("freepik_text_to_image", ctx => this.handler.showTextToImageMenu(ctx));
    this.router.register("freepik_styled_images", ctx => this.handler.showStyledImageMenu(ctx));
    this.router.register("freepik_image_to_video", ctx => this.handler.showImageToVideoMenu(ctx));
  }
  
  async handleCallback(ctx: any): Promise<boolean> {
    return await this.router.route(ctx);
  }
}
