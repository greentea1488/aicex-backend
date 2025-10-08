import { config } from "dotenv";
import { Request, Response } from "express";
import { OpenAI } from "openai";
import { prisma } from "../utils/prismaClient";
config();

// Get all chat dialogs
export const getChatDialogs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const dialogs = await prisma.chatHistory.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(dialogs);
  } catch (error) {
    console.error("Error fetching dialogs:", error);
    return res.status(500).json({ error: "Error fetching dialogs" });
  }
};

// Get specific chat history
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { dialogId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const chat = await prisma.chatHistory.findFirst({
      where: {
        id: dialogId,
        userId,
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Dialog not found" });
    }

    return res.json(chat);
  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ error: "Error fetching chat history" });
  }
};

// Create new dialog
export const createDialog = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { title = "Новый диалог" } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const dialog = await prisma.chatHistory.create({
      data: {
        userId,
        title,
        messages: [],
      },
    });

    return res.status(201).json(dialog);
  } catch (error) {
    console.error("Error creating dialog:", error);
    return res.status(500).json({ error: "Error creating dialog" });
  }
};

// Update dialog (add message or update title)
export const updateDialog = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { dialogId } = req.params;
    const { title, message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if dialog exists and belongs to user
    const existingDialog = await prisma.chatHistory.findFirst({
      where: {
        id: dialogId,
        userId,
      },
    });

    if (!existingDialog) {
      return res.status(404).json({ error: "Dialog not found" });
    }

    const updateData: any = {};

    if (title) {
      updateData.title = title;
    }

    if (message) {
      updateData.messages = {
        push: message,
      };
    }

    const updatedDialog = await prisma.chatHistory.update({
      where: { id: dialogId },
      data: updateData,
    });

    return res.json(updatedDialog);
  } catch (error) {
    console.error("Error updating dialog:", error);
    return res.status(500).json({ error: "Error updating dialog" });
  }
};

// Delete dialog
export const deleteDialog = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { dialogId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if dialog exists and belongs to user
    const existingDialog = await prisma.chatHistory.findFirst({
      where: {
        id: dialogId,
        userId,
      },
    });

    if (!existingDialog) {
      return res.status(404).json({ error: "Dialog not found" });
    }

    await prisma.chatHistory.delete({
      where: { id: dialogId },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting dialog:", error);
    return res.status(500).json({ error: "Error deleting dialog" });
  }
};

// Send message to AI
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { dialogId } = req.params;
    const { message, model = "gpt-4.1-mini" } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check user tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true },
    });

    if (!user || user.tokens <= 0) {
      return res.status(403).json({ error: "Insufficient tokens" });
    }

    // Get dialog
    const dialog = await prisma.chatHistory.findFirst({
      where: {
        id: dialogId,
        userId,
      },
    });

    if (!dialog) {
      return res.status(404).json({ error: "Dialog not found" });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare messages for OpenAI
    const messages = [...(dialog.messages as any[]), { role: "user", content: message }];

    // Send to OpenAI
    const completion = await openai.chat.completions.create({
      model,
      messages,
    });

    const aiResponse = completion.choices[0].message;

    // Update dialog with new messages
    const updatedMessages = [...(dialog.messages as any[]), { role: "user", content: message }, { role: aiResponse.role, content: aiResponse.content }];

    await prisma.chatHistory.update({
      where: { id: dialogId },
      data: {
        messages: updatedMessages,
      },
    });

    // Get current balance before deducting tokens
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true }
    });

    const balanceBefore = currentUser?.tokens || 0;
    const balanceAfter = balanceBefore - 1;

    // Deduct tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokens: { decrement: 1 },
      },
    });

    // Record token usage
    await prisma.tokenHistory.create({
      data: {
        userId,
        amount: -1,
        type: "SPEND_CHATGPT",
        balanceBefore,
        balanceAfter,
      },
    });

    return res.json({
      response: aiResponse.content,
      tokensRemaining: user.tokens - 1,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ error: "Error processing message" });
  }
};
