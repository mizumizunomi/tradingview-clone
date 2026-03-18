import axios from "axios";

const API_BASE = "/backend";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const endpoints = {
  login: "/auth/login",
  register: "/auth/register",
  me: "/auth/me",
  assets: "/assets",
  asset: (id: string) => `/assets/${id}`,
  candles: (symbol: string, timeframe: string) =>
    `/market-data/candles/${symbol}?timeframe=${timeframe}`,
  prices: "/market-data/prices",
  orders: "/trading/orders",
  placeOrder: "/trading/orders",
  positions: "/trading/positions",
  closedPositions: "/trading/positions/closed",
  closePosition: (id: string) => `/trading/positions/${id}/close`,
  cancelOrder: (id: string) => `/trading/orders/${id}`,
  wallet: "/wallet",
  deposit: "/wallet/deposit",
  withdraw: "/wallet/withdraw",
  transactions: "/wallet/transactions",
  // Account pages (new)
  depositAccount: "/wallet/deposit",
  withdrawAccount: "/wallet/withdraw",
  accountTransactions: "/wallet/transactions",
  planSummary: "/wallet/plan-summary",
  updatePlan: "/auth/plan",
  updateProfile: "/auth/profile",
  // Bot
  botSignals: "/bot/signals",
  botGenerateSignal: "/bot/signals/generate",
  botExecuteSignal: (id: string) => `/bot/signals/${id}/execute`,
  botCancelSignal: (id: string) => `/bot/signals/${id}/cancel`,
  botAnalysis: (asset: string) => `/bot/analysis/${asset}`,
  botResearch: (asset: string) => `/bot/research/${asset}`,
  botStrategies: "/bot/strategies",
  botStrategy: (id: string) => `/bot/strategies/${id}`,
  botBacktest: (id: string) => `/bot/strategies/${id}/backtest`,
  botSettings: "/bot/settings",
  botDashboard: "/bot/dashboard",
  botStatus: "/bot/status",
  // Plan
  planInfo: "/plan",
  planTiers: "/plan/tiers",
  // Bot v2 — chart-integrated analysis
  botAnalyze: "/bot/analyze",
};
