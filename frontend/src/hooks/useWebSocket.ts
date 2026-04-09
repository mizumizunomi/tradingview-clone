"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";

export function useWebSocket(): { socketRef: React.RefObject<Socket | null>; connected: boolean } {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { updatePrice, user } = useTradingStore();

  useEffect(() => {
    let socket: Socket;
    let cancelled = false;

    async function connect() {
      let wsUrl = "http://localhost:3001";
      try {
        const res = await fetch("/api/config");
        const cfg = await res.json();
        if (cfg.wsUrl) wsUrl = cfg.wsUrl;
      } catch {}

      if (cancelled) return;

      socket = io(wsUrl, {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        const token = localStorage.getItem("token");
        if (token) socket.emit("auth", { token });
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("prices:all", (prices: any[]) => {
        prices.forEach((p) => updatePrice(p));
      });

      socket.on("price:update", (data: any) => {
        updatePrice(data);
      });

      socket.on("wallet:update", (data: { equity: number; freeMargin: number; margin: number }) => {
        const currentWallet = useTradingStore.getState().wallet;
        if (currentWallet) {
          useTradingStore.getState().setWallet({ ...currentWallet, ...data });
        }
      });

      socket.on("position:closed", async () => {
        try {
          const [posRes, closedRes, walletRes] = await Promise.all([
            api.get(endpoints.positions),
            api.get(endpoints.closedPositions),
            api.get(endpoints.wallet),
          ]);
          useTradingStore.getState().setPositions([
            ...posRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })),
            ...closedRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })),
          ]);
          useTradingStore.getState().setWallet(walletRes.data);
        } catch {}
      });
    }

    connect();

    return () => {
      cancelled = true;
      setConnected(false);
      socketRef.current?.disconnect();
    };
  }, [updatePrice]);

  useEffect(() => {
    if (user?.id && socketRef.current?.connected) {
      const token = localStorage.getItem("token");
      if (token) socketRef.current.emit("auth", { token });
    }
  }, [user?.id]);

  return { socketRef, connected };
}
