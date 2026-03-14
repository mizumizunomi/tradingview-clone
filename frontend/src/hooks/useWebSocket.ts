"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { updatePrice, setWallet, setPositions, positions, wallet, user } = useTradingStore();

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    const socket = io(wsUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Authenticate socket so backend can push user-specific events
      const storeUser = useTradingStore.getState().user;
      if (storeUser?.id) {
        socket.emit("auth", storeUser.id);
      }
    });

    socket.on("prices:all", (prices: any[]) => {
      prices.forEach((p) => updatePrice(p));
    });

    socket.on("price:update", (data: any) => {
      updatePrice(data);
    });

    // Real-time wallet equity updates
    socket.on("wallet:update", (data: { equity: number; freeMargin: number; margin: number }) => {
      const currentWallet = useTradingStore.getState().wallet;
      if (currentWallet) {
        useTradingStore.getState().setWallet({ ...currentWallet, ...data });
      }
    });

    // Position auto-closed (SL/TP triggered)
    socket.on("position:closed", async (data: { positionId: string; pnl: number }) => {
      // Refresh positions and wallet from server
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

    return () => {
      socket.disconnect();
    };
  }, [updatePrice]);

  // Re-auth when user changes
  useEffect(() => {
    if (user?.id && socketRef.current?.connected) {
      socketRef.current.emit("auth", user.id);
    }
  }, [user?.id]);

  return socketRef;
}
