"use client";
import { useState, useEffect } from "react";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Position, Order } from "@/types";
import { TrendingUp, Clock, History, X, Bell, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PositionsPanel() {
  const { positions, setPositions, setWallet, activeBottomTab, setActiveBottomTab, prices, addToast, alerts, removeAlert } = useTradingStore();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeBottomTab === "orders") {
      api.get(endpoints.orders).then((res) => {
        const pending = res.data
          .filter((o: any) => o.status === "PENDING")
          .map((o: any) => ({ ...o, symbol: o.asset?.symbol || o.symbol, assetName: o.asset?.name }));
        setPendingOrders(pending);
      }).catch(() => {});
    }
  }, [activeBottomTab]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await api.delete(endpoints.cancelOrder(orderId));
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      addToast({ type: "info", message: "Order cancelled" });
    } catch {
      addToast({ type: "error", message: "Failed to cancel order" });
    } finally {
      setCancellingId(null);
    }
  };

  const openPositions = positions.filter((p) => p.isOpen);
  const closedPositions = positions.filter((p) => !p.isOpen);

  const getPositionPnL = (p: Position) => {
    const pd = prices[p.symbol];
    if (!pd) return p.unrealizedPnL;
    const diff = p.side === "BUY" ? pd.price - p.entryPrice : p.entryPrice - pd.price;
    return diff * p.quantity * p.leverage - p.commission;
  };

  const totalPnL = openPositions.reduce((sum, p) => sum + getPositionPnL(p), 0);

  const handleClose = async (position: Position) => {
    setClosingId(position.id);
    try {
      await api.post(endpoints.closePosition(position.id));
      const [posRes, closedRes, walletRes] = await Promise.all([
        api.get(endpoints.positions),
        api.get(endpoints.closedPositions),
        api.get(endpoints.wallet),
      ]);
      setPositions([
        ...posRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })),
        ...closedRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })),
      ]);
      setWallet(walletRes.data);
    } catch (err: any) {
      console.error("Failed to close position:", err);
    } finally {
      setClosingId(null);
    }
  };

  const tabs = [
    { key: "positions" as const, label: "Positions", count: openPositions.length, icon: TrendingUp },
    { key: "orders" as const, label: "Orders", count: pendingOrders.length, icon: Clock },
    { key: "history" as const, label: "History", count: closedPositions.length, icon: History },
    { key: "alerts" as const, label: "Alerts", count: alerts.filter((a) => !a.triggered).length, icon: Bell },
  ];

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--tv-bg)" }}>
      {/* Tab bar */}
      <div className="flex items-center border-b px-1" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveBottomTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
              activeBottomTab === key
                ? "border-[#2962ff] text-white"
                : "border-transparent text-[#5d6673] hover:text-[#b2b5be]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeBottomTab === key ? "bg-[#2962ff] text-white" : "bg-[#2a2e39] text-[#5d6673]"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}

        {/* Total P&L */}
        <div className="ml-auto flex items-center gap-2 pr-3">
          {openPositions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#5d6673]">Total P&L</span>
              <span className={cn(
                "font-mono text-xs font-bold",
                totalPnL >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
              )}>
                {totalPnL >= 0 ? "+" : ""}${formatPrice(Math.abs(totalPnL))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeBottomTab === "positions" && (
          openPositions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[#5d6673]">
              <TrendingUp className="h-8 w-8 opacity-30" />
              <div className="text-sm">No open positions</div>
              <div className="text-xs opacity-60">Place a trade to get started</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#363a45] bg-[#1e222d]">
                  {["Symbol", "Side", "Qty", "Lev", "Entry", "Current", "P&L", "Margin", "S/L", "T/P", ""].map((h) => (
                    <th key={h} className={cn(
                      "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5d6673] whitespace-nowrap",
                      h === "" || h === "P&L" || h === "Current" || h === "Entry" ? "text-right" : "text-left"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d]">
                {openPositions.map((pos) => {
                  const pnl = getPositionPnL(pos);
                  const currentPrice = prices[pos.symbol]?.price || pos.currentPrice;
                  const isProfit = pnl >= 0;
                  const isBuy = pos.side === "BUY";
                  return (
                    <tr key={pos.id} className="group hover:bg-[#1e222d] transition-colors">
                      <td className="px-3 py-2">
                        <div className="text-xs font-bold text-white">{pos.symbol}</div>
                        <div className="text-[10px] text-[#5d6673] truncate max-w-[80px]">{pos.assetName?.split(" ").slice(0, 2).join(" ")}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          isBuy ? "bg-[#26a69a20] text-[#26a69a]" : "bg-[#ef535020] text-[#ef5350]"
                        )}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-[#d1d4dc]">{pos.quantity}</td>
                      <td className="px-3 py-2 text-xs text-[#b2b5be]">{pos.leverage}×</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#d1d4dc]">
                        {pos.entryPrice < 10 ? pos.entryPrice.toFixed(5) : formatPrice(pos.entryPrice)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white font-medium">
                        {currentPrice < 10 ? currentPrice.toFixed(5) : formatPrice(currentPrice)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className={cn("font-mono text-xs font-bold", isProfit ? "text-[#26a69a]" : "text-[#ef5350]")}>
                          {isProfit ? "+" : ""}${formatPrice(Math.abs(pnl))}
                        </div>
                        <div className={cn("text-[10px]", isProfit ? "text-[#26a69a]" : "text-[#ef5350]")}>
                          {pos.entryPrice > 0
                            ? `${isProfit ? "+" : ""}${(((pnl / (pos.margin || 1)) * 100)).toFixed(1)}%`
                            : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#b2b5be]">${formatPrice(pos.margin)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#ef5350]">
                        {pos.stopLoss ? (pos.stopLoss < 10 ? pos.stopLoss.toFixed(5) : formatPrice(pos.stopLoss)) : <span className="text-[#5d6673]">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#26a69a]">
                        {pos.takeProfit ? (pos.takeProfit < 10 ? pos.takeProfit.toFixed(5) : formatPrice(pos.takeProfit)) : <span className="text-[#5d6673]">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleClose(pos)}
                          disabled={closingId === pos.id}
                          className="rounded border border-[#ef535040] px-2 py-0.5 text-[10px] font-medium text-[#ef5350] opacity-0 group-hover:opacity-100 hover:bg-[#ef5350] hover:text-white hover:border-[#ef5350] disabled:opacity-50 transition-all"
                        >
                          {closingId === pos.id ? "..." : "Close"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {activeBottomTab === "orders" && (
          pendingOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2" style={{ color: "var(--tv-muted)" }}>
              <Clock className="h-8 w-8 opacity-30" />
              <div className="text-sm">No pending orders</div>
              <div className="text-xs opacity-60">Limit orders will appear here</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
                  {["Symbol","Side","Type","Qty","Lev","Limit Price","Created",""].map((h) => (
                    <th key={h} className={cn("px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap", h === "" || h === "Limit Price" ? "text-right" : "text-left")}
                      style={{ color: "var(--tv-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="group border-b hover:bg-[var(--tv-bg3)] transition-colors"
                    style={{ borderColor: "var(--tv-border)" }}>
                    <td className="px-3 py-2 text-xs font-bold" style={{ color: "var(--tv-text-light)" }}>{order.symbol}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        order.side === "BUY" ? "bg-[#26a69a20] text-[#26a69a]" : "bg-[#ef535020] text-[#ef5350]")}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--tv-text)" }}>{order.type}</td>
                    <td className="px-3 py-2 text-xs font-mono" style={{ color: "var(--tv-text-light)" }}>{order.quantity}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--tv-text)" }}>{order.leverage}×</td>
                    <td className="px-3 py-2 text-right font-mono text-xs" style={{ color: "var(--tv-text-light)" }}>
                      {order.limitPrice ? formatPrice(order.limitPrice) : "—"}
                    </td>
                    <td className="px-3 py-2 text-[11px]" style={{ color: "var(--tv-muted)" }}>
                      {new Date(order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => handleCancelOrder(order.id)} disabled={cancellingId === order.id}
                        className="rounded border px-2 py-0.5 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ef5350] hover:text-white hover:border-[#ef5350]"
                        style={{ borderColor: "#ef535040", color: "#ef5350" }}>
                        {cancellingId === order.id ? "..." : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeBottomTab === "alerts" && (
          alerts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2" style={{ color: "var(--tv-muted)" }}>
              <Bell className="h-8 w-8 opacity-30" />
              <div className="text-sm">No alerts set</div>
              <div className="text-xs opacity-60">Right-click on the chart to add a price alert</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
                  {["Symbol", "Price", "Condition", "Status", ""].map((h) => (
                    <th key={h} className={cn("px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap", h === "" ? "text-right" : "text-left")}
                      style={{ color: "var(--tv-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="group border-b hover:bg-[var(--tv-bg3)] transition-colors"
                    style={{ borderColor: "var(--tv-border)" }}>
                    <td className="px-3 py-2 text-xs font-bold" style={{ color: "var(--tv-text-light)" }}>{alert.symbol}</td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--tv-text-light)" }}>{alert.price?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--tv-text)" }}>{alert.condition ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        alert.triggered ? "bg-[#ef535020] text-[#ef5350]" : "bg-[#26a69a20] text-[#26a69a]")}>
                        {alert.triggered ? "Triggered" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeAlert(alert.id)}
                        className="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-[#ef535020] transition-all"
                        style={{ color: "#ef5350" }}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeBottomTab === "history" && (
          closedPositions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[#5d6673]">
              <History className="h-8 w-8 opacity-30" />
              <div className="text-sm">No trade history yet</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#363a45] bg-[#1e222d]">
                  {["Symbol", "Side", "Qty", "Entry", "Close", "P&L", "Commission", "Closed At"].map((h) => (
                    <th key={h} className={cn(
                      "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5d6673]",
                      ["Entry", "Close", "P&L", "Commission", "Closed At"].includes(h) ? "text-right" : "text-left"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d]">
                {closedPositions.map((pos) => {
                  const isProfit = pos.realizedPnL >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[#1e222d] transition-colors">
                      <td className="px-3 py-2">
                        <div className="text-xs font-bold text-white">{pos.symbol}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          pos.side === "BUY" ? "bg-[#26a69a20] text-[#26a69a]" : "bg-[#ef535020] text-[#ef5350]"
                        )}>{pos.side}</span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-[#d1d4dc]">{pos.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#d1d4dc]">
                        {pos.entryPrice < 10 ? pos.entryPrice.toFixed(5) : formatPrice(pos.entryPrice)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#d1d4dc]">
                        {pos.currentPrice < 10 ? pos.currentPrice.toFixed(5) : formatPrice(pos.currentPrice)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn("font-mono text-xs font-bold", isProfit ? "text-[#26a69a]" : "text-[#ef5350]")}>
                          {isProfit ? "+" : ""}${formatPrice(Math.abs(pos.realizedPnL))}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#5d6673]">
                        ${formatPrice(pos.commission)}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] text-[#5d6673]">
                        {pos.closedAt ? new Date(pos.closedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
