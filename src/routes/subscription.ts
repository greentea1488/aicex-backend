import { Router } from "express";
import jwtMiddleware from "../middlewares/jwtMw";
import { 
  getSubscriptionPlans,
  getUserSubscription,
  createSubscription,
  cancelSubscription
} from "../controllers/SubscriptionController";

const router = Router();

// Public routes
router.get("/plans", getSubscriptionPlans);

// Protected routes
router.use(jwtMiddleware);
router.get("/current", getUserSubscription);
router.post("/create", createSubscription);
router.post("/cancel", cancelSubscription);

export default router;
