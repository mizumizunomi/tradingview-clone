import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  updatePlan: "/auth/plan",
  updateProfile: "/auth/profile",
};
