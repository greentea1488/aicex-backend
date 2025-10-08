import { config } from "dotenv";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
config();

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export interface UserPayload {
  id: string;
  userId: string;
  telegramId: number;
  username?: string;
  isAdmin?: boolean;
}

export default function (req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userData = jwt.verify(accessToken, process.env.JWT_SECRET!);

    if (!userData) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = userData as UserPayload;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
}
