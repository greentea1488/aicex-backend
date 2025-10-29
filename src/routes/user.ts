import { Router } from "express";
import jwtMiddleware from "../middlewares/jwtMw";
import { 
  getUserProfile, 
  updateUserSettings, 
  getUserTokens,
  getUserTokenHistory,
  getUserPaymentHistory, 
  getUserSubscription, 
  getReferralStats, 
  getUserReferrals,
  updateUserProfile,
  getUserStats,
  getUserAvatar
} from "../controllers/userController";

const router = Router();

// All routes require authentication
router.use(jwtMiddleware);

// User profile routes
router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);
router.put("/settings", updateUserSettings);
router.get("/avatar", getUserAvatar);

// User tokens and subscription
router.get("/tokens", getUserTokens);
router.get("/tokens/history", getUserTokenHistory);
router.get("/payments/history", getUserPaymentHistory);
router.get("/subscription", getUserSubscription);

// User statistics
router.get("/stats", getUserStats);

// Referral routes
router.get("/referral/stats", getReferralStats);
router.get("/referral/list", getUserReferrals);

export default router;
