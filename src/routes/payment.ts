import { Router } from "express";
import jwtMiddleware from "../middlewares/jwtMw";
import { createPayment, getPaymentHistory, getTokenHistory, buyTokens, updateSubscription, getSubscriptionPlans, createLavaSubscriptionPayment, createLavaTokenPayment } from "../controllers/paymentController";

const router = Router();

// Public routes
router.get("/subscription/plans", getSubscriptionPlans);

// Protected routes
router.use(jwtMiddleware);

// Payment routes
router.post("/create", createPayment);
router.get("/history", getPaymentHistory);

// Token routes
router.get("/tokens/history", getTokenHistory);
router.post("/tokens/buy", buyTokens);

// Subscription routes
router.post("/subscription/update", updateSubscription);

// Lava payment routes
router.post("/lava/create-subscription", createLavaSubscriptionPayment);
router.post("/lava/create-tokens", createLavaTokenPayment);

export default router;
