"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { api, endpoints } from "@/lib/api";
import type {
  TradingSignal, BotSettings, BotDashboardData,
  BotStrategy, ResearchReport, AssetClass,
} from "@/types/bot";

export function useBot() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [dashboard, setDashboard] = useState<BotDashboardData | null>(null);
  const [strategies, setStrategies] = useState<BotStrategy[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [dashRes, sigRes, stratRes] = await Promise.all([
        api.get(endpoints.botDashboard),
        api.get(endpoints.botSignals + "?limit=50"),
        api.get(endpoints.botStrategies),
      ]);
      setDashboard(dashRes.data);
      setSettings(dashRes.data.settings);
      setSignals(sigRes.data);
      setStrategies(stratRes.data);
    } catch (err) {
      console.error("Bot load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket for live signal push
  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001")
      .replace(/^https/, "wss").replace(/^http/, "ws");
    const socket: Socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001",
      { transports: ["polling", "websocket"], path: "/socket.io" }
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      const token = localStorage.getItem("token");
      if (token) {
        // Decode userId from JWT (simple base64 parse — no crypto needed)
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          socket.emit("auth", payload.sub ?? payload.userId);
        } catch {}
      }
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("bot:signal:new", (signal: TradingSignal) => {
      setSignals((prev) => [signal, ...prev.slice(0, 49)]);
    });

    socket.on("bot:signal:executed", (data: { signalId: string }) => {
      setSignals((prev) =>
        prev.map((s) => s.id === data.signalId ? { ...s, status: "EXECUTED", autoExecuted: true } : s)
      );
    });

    socket.on("bot:signal:expired", (data: { signalId: string }) => {
      setSignals((prev) =>
        prev.map((s) => s.id === data.signalId ? { ...s, status: "EXPIRED" } : s)
      );
    });

    void wsUrl; // suppress unused warning
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const generateSignal = useCallback(async (
    asset: string, assetClass: AssetClass, timeframe = "1h"
  ): Promise<TradingSignal | null> => {
    try {
      const res = await api.post(endpoints.botGenerateSignal, { asset, assetClass, timeframe });
      const signal: TradingSignal = res.data;
      setSignals((prev) => [signal, ...prev.slice(0, 49)]);
      return signal;
    } catch { return null; }
  }, []);

  const executeSignal = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.post(endpoints.botExecuteSignal(id));
      setSignals((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "EXECUTED" } : s)
      );
      return true;
    } catch { return false; }
  }, []);

  const cancelSignal = useCallback(async (id: string): Promise<void> => {
    await api.post(endpoints.botCancelSignal(id));
    setSignals((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: "CANCELLED" } : s)
    );
  }, []);

  const updateSettings = useCallback(async (updates: Partial<BotSettings>): Promise<void> => {
    const res = await api.put(endpoints.botSettings, updates);
    setSettings(res.data);
  }, []);

  const runResearch = useCallback(async (
    asset: string, assetClass: AssetClass
  ): Promise<ResearchReport | null> => {
    try {
      const res = await api.post(`${endpoints.botResearch(asset)}?assetClass=${assetClass}`);
      return res.data;
    } catch { return null; }
  }, []);

  return {
    signals, settings, dashboard, strategies, connected, loading,
    generateSignal, executeSignal, cancelSignal, updateSettings, runResearch,
    reload: loadDashboard, setStrategies,
  };
}
