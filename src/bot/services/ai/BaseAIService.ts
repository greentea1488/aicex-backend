export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class BaseAIService {
  abstract getName(): string;
  abstract chat(messages: AIMessage[], userId: string): Promise<AIResponse>;
  abstract validateConfig(): boolean;
}
