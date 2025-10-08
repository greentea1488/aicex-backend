import axios from "axios";
import { BaseAIService, AIMessage, AIResponse } from "./BaseAIService";
import { prisma } from "../../../utils/prismaClient";

export class KlingService extends BaseAIService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    super();
    // Kling API endpoint
    this.apiUrl = process.env.KLING_API_URL || "https://api.kling.ai/v1";
    this.apiKey = process.env.KLING_API_KEY || "";
  }

  getName(): string {
    return "Kling AI";
  }

  validateConfig(): boolean {
    return !!this.apiKey && !!this.apiUrl;
  }

  async chat(messages: AIMessage[], userId: string): Promise<AIResponse> {
    try {
      // Get the last user message as the prompt
      const userMessages = messages.filter(m => m.role === "user");
      const prompt = userMessages[userMessages.length - 1]?.content;

      if (!prompt) {
        throw new Error("No prompt provided");
      }

      // Check if this is a video generation request
      if (this.isVideoGenerationRequest(prompt)) {
        return await this.generateVideo(prompt, userId);
      } else {
        // For non-video requests, provide guidance
        return {
          content:
            "📹 Kling AI - Video Generator\n\n" +
            "To generate a video, describe what you want to see. For example:\n" +
            "• 'A cat playing piano in slow motion'\n" +
            "• 'Time-lapse of flowers blooming'\n" +
            "• 'Futuristic cityscape with flying cars'\n\n" +
            "Video specifications:\n" +
            "• Duration: 5-10 seconds\n" +
            "• Resolution: up to 1080p\n" +
            "• Style: realistic or artistic\n\n" +
            "What video would you like me to create?",
        };
      }
    } catch (error) {
      console.error("Kling Service Error:", error);
      throw new Error("Failed to process Kling request");
    }
  }

  private isVideoGenerationRequest(prompt: string): boolean {
    const videoKeywords = ["video", "animate", "motion", "moving", "action", "scene"];
    const lowerPrompt = prompt.toLowerCase();

    // If prompt is descriptive and longer than 10 characters, assume it's a video request
    if (prompt.length > 10 && !lowerPrompt.match(/^(what|how|why|when|where|who|is|are|can|could|should)/)) {
      return true;
    }

    return videoKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  private async generateVideo(prompt: string, userId: string): Promise<AIResponse> {
    try {
      // Get user settings
      const user = await prisma.user.findUnique({
        where: { telegramId: parseInt(userId) },
      });

      // Make request to Kling API
      const response = await axios.post(
        `${this.apiUrl}/generate`,
        {
          prompt: prompt,
          duration: 5, // Default 5 seconds
          resolution: "1080p",
          style: "realistic",
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const taskId = response.data.taskId;
        const result = await this.pollForVideoResult(taskId);

        if (result && result.videoUrl) {
          return {
            content:
              `📹 Video generated successfully!\n\n` +
              `Prompt: ${prompt}\n` +
              `Duration: ${result.duration}s\n` +
              `Resolution: ${result.resolution}\n\n` +
              `[Download Video](${result.videoUrl})\n\n` +
              `Video will be available for 24 hours.`,
          };
        }
      }

      throw new Error("Failed to generate video");
    } catch (error: any) {
      console.error("Kling generation error:", error);

      if (error.response?.status === 429) {
        return {
          content: "⏳ Rate limit reached. Video generation is limited to 10 per hour. Please try again later.",
        };
      }

      if (error.response?.status === 402) {
        return {
          content: "💳 Insufficient credits. Video generation requires premium subscription or additional tokens.",
        };
      }

      return {
        content: "❌ Failed to generate video. Please try again with a different prompt or check your subscription status.",
      };
    }
  }

  private async pollForVideoResult(taskId: string, maxAttempts: number = 120): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${this.apiUrl}/task/${taskId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (response.data.status === "completed") {
          return {
            videoUrl: response.data.result.url,
            duration: response.data.result.duration,
            resolution: response.data.result.resolution,
            taskId: taskId,
          };
        } else if (response.data.status === "failed") {
          throw new Error(`Video generation failed: ${response.data.error}`);
        }

        // Wait 3 seconds before next poll (video generation takes longer)
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error("Polling error:", error);
        throw error;
      }
    }

    throw new Error("Timeout waiting for video generation");
  }
}
