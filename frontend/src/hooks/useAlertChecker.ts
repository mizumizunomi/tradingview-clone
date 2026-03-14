"use client";
import { useEffect } from "react";
import { useTradingStore } from "@/store/trading.store";

export function useAlertChecker() {
  const prices = useTradingStore((s) => s.prices);
  const alerts = useTradingStore((s) => s.alerts);
  const triggerAlert = useTradingStore((s) => s.triggerAlert);
  const addToast = useTradingStore((s) => s.addToast);

  useEffect(() => {
    alerts.forEach((alert) => {
      if (alert.triggered) return;
      const pd = prices[alert.symbol];
      if (!pd) return;
      const hit =
        (alert.condition === "above" && pd.price >= alert.price) ||
        (alert.condition === "below" && pd.price <= alert.price);
      if (hit) {
        triggerAlert(alert.id);
        addToast({
          type: "warning",
          message: `🔔 Alert: ${alert.symbol} ${alert.condition} ${alert.price.toFixed(2)}${alert.message ? ` — ${alert.message}` : ""}`,
          duration: 8000,
        });
      }
    });
  }, [prices]);
}
