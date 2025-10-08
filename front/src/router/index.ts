import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/home"
    },
    {
      path: "/home",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/payment/:type",
      name: "payment",
      component: () => import("../views/PaymentView.vue"),
    },
    {
      path: "/test-payment",
      name: "test-payment",
      component: () => import("../views/TestPaymentView.vue"),
    },
    {
      path: "/faq",
      name: "faq",
      component: () => import("../views/FaqView.vue"),
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/ProfileView.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../views/SettingsView.vue"),
    },
    {
      path: "/subscription",
      name: "subscription",
      component: () => import("../views/SubscriptionView.vue"),
    },
    {
      path: "/history",
      name: "history",
      component: () => import("../views/PaymentsHistoryView.vue"),
    },
    {
      path: "/generations",
      name: "generations",
      component: () => import("../views/GenerationsHistoryView.vue"),
    },
    {
      path: "/referrals",
      name: "referrals",
      component: () => import("../views/ReferralsView.vue"),
    },
    {
      path: "/news",
      name: "news",
      component: () => import("../views/NewsView.vue"),
    },
    {
      path: "/settings/gpt",
      name: "gpt settings",
      component: () => import("../views/GPTView.vue"),
    },
    {
      path: "/settings5",
      name: "settings5",
      component: () => import("../views/Settings5View.vue"),
    },
    {
      path: "/settings6",
      name: "settings6",
      component: () => import("../views/GptSettings/Dialogs.vue"),
    },
    {
      path: "/settings7",
      name: "settings7",
      component: () => import("../views/Settings7View.vue"),
    },
  ],
});

export default router;
