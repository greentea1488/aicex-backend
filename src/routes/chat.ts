import { Router } from "express";
import jwtMiddleware from "../middlewares/jwtMw";
import { getChatDialogs, getChatHistory, createDialog, updateDialog, deleteDialog, sendMessage } from "../controllers/chatController";

const router = Router();

// All routes require authentication
router.use(jwtMiddleware);

// Dialog management
router.get("/dialogs", getChatDialogs);
router.post("/dialogs", createDialog);
router.get("/dialogs/:dialogId", getChatHistory);
router.put("/dialogs/:dialogId", updateDialog);
router.delete("/dialogs/:dialogId", deleteDialog);

// Chat interaction
router.post("/dialogs/:dialogId/message", sendMessage);

export default router;
