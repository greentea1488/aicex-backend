import { BotRouter } from "./BotRouter";
import { ChatGPTHandler } from "../handlers/chatgptHandler";

export class ChatGPTRouter {
  private router: BotRouter;
  private handler: ChatGPTHandler;
  
  constructor(handler: ChatGPTHandler) {
    this.router = new BotRouter();
    this.handler = handler;
    this.registerRoutes();
  }
  
  private registerRoutes(): void {
    // Главное меню
    this.router.register("chatgpt_back_to_main", ctx => this.handler.showMainMenu(ctx));
    
    // Основные функции
    this.router.register("chatgpt_text_chat", ctx => this.handler.startTextChat(ctx));
    this.router.register("chatgpt_image_gen", ctx => this.handler.showImageGenMenu(ctx));
  }
  
  async handleCallback(ctx: any): Promise<boolean> {
    return await this.router.route(ctx);
  }
}
