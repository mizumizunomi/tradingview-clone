"use client";
import { useMemo } from "react";
import { OrderBookEntry } from "@/types";

export function useSimulatedOrderBook(bid: number, ask: number, depth = 12) {
  return useMemo(() => {
    if (!bid || !ask) return { bids: [], asks: [] };
    const spread = ask - bid;
    const tick = spread > 0 ? spread / 2 : bid * 0.0001;

    // Seed from price for stable values
    const seed = Math.floor(bid * 100);
    const pseudo = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };

    const bids: OrderBookEntry[] = [];
    let bidTotal = 0;
    for (let i = 0; i < depth; i++) {
      const price = bid - i * tick;
      const size = parseFloat((pseudo(i) * 5 + 0.1).toFixed(3));
      bidTotal += size;
      bids.push({ price, size, total: parseFloat(bidTotal.toFixed(3)) });
    }

    const asks: OrderBookEntry[] = [];
    let askTotal = 0;
    for (let i = 0; i < depth; i++) {
      const price = ask + i * tick;
      const size = parseFloat((pseudo(i + 100) * 5 + 0.1).toFixed(3));
      askTotal += size;
      asks.push({ price, size, total: parseFloat(askTotal.toFixed(3)) });
    }

    return { bids, asks };
  }, [bid, ask]);
}
