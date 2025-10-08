import { Router } from "express";
import { authUser, getMyself } from "../controllers/authController";
import jwtMiddleware from "../middlewares/jwtMw";

const router = Router();

router.post("/auth", authUser);
router.get("/myself", jwtMiddleware, getMyself);

export default router;
