"use client";
import { useEffect, useCallback } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";

interface TradeConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  // Trade details
  symbol: string;
  assetName: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT";
  quantity: number;
  leverage: number;
  entryPrice: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  marginRequired: number;
  commission: number;
  notionalValue: number;
  availableMargin: number;
}

export function TradeConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  loading,
  symbol,
  assetName,
  side,
  orderType,
  quantity,
  leverage,
  entryPrice,
  limitPrice,
  stopLoss,
  takeProfit,
  marginRequired,
  commission,
  notionalValue,
  availableMargin,
}: TradeConfirmModalProps) {
  const isBuy = side === "BUY";
  const marginWarning = marginRequired > availableMargin;
  const marginHighUsage = marginRequired > availableMargin * 0.8;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    },
    [onCancel, loading]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const formatNum = (n: number) => {
    if (n < 10) return n.toFixed(5);
    return n.toFixed(2);
  };

  const rows: { label: string; value: string; valueColor?: string }[] = [
    {
      label: "Direction",
      value: side,
      valueColor: isBuy ? "#26a69a" : "#ef5350",
    },
    {
      label: "Volume (Lots)",
      value: String(quantity),
    },
    {
      label: "Leverage",
      value: `${leverage}x`,
    },
    {
      label: "Entry Price",
      value:
        orderType === "MARKET"
          ? "At Market"
          : limitPrice !== undefined
          ? `$${formatNum(limitPrice)}`
          : `$${formatNum(entryPrice)}`,
    },
    {
      label: "Stop Loss",
      value: stopLoss !== undefined ? `$${formatNum(stopLoss)}` : "—",
      valueColor: stopLoss !== undefined ? "#ef5350" : undefined,
    },
    {
      label: "Take Profit",
      value: takeProfit !== undefined ? `$${formatNum(takeProfit)}` : "—",
      valueColor: takeProfit !== undefined ? "#26a69a" : undefined,
    },
    {
      label: "Notional Value",
      value: `$${formatPrice(notionalValue)}`,
    },
    {
      label: "Margin Required",
      value: `$${formatPrice(marginRequired)}`,
      valueColor: marginHighUsage ? "#f59e0b" : undefined,
    },
    {
      label: "Estimated Fee",
      value: `$${formatPrice(commission)}`,
    },
    {
      label: "Available Margin",
      value: `$${formatPrice(availableMargin)}`,
      valueColor: marginWarning ? "#ef5350" : "#26a69a",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "#1e222d", border: "1px solid #363a45" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "#131722", borderBottom: "1px solid #363a45" }}
        >
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{symbol}</span>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                    isBuy
                      ? "bg-[#26a69a22] text-[#26a69a] border border-[#26a69a44]"
                      : "bg-[#ef535022] text-[#ef5350] border border-[#ef535044]"
                  )}
                >
                  {side}
                </span>
                <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#2962ff22] text-[#2962ff] border border-[#2962ff44]">
                  {orderType}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#5d6673]">{assetName}</div>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1 rounded hover:bg-[#363a45] text-[#5d6673] hover:text-white transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Detail rows */}
          <div
            className="rounded-lg overflow-hidden divide-y"
            style={{ border: "1px solid #363a45" }}
          >
            {rows.map(({ label, value, valueColor }) => (
              <div
                key={label}
                className="flex justify-between items-center px-3 py-2"
                style={{ background: "#131722", borderColor: "#1e222d" }}
              >
                <span className="text-[11px] text-[#5d6673]">{label}</span>
                <span
                  className="text-[11px] font-mono font-medium"
                  style={{ color: valueColor || "#d1d4dc" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Margin warning */}
          {marginWarning && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs bg-[#ef535015] border border-[#ef535040] text-[#ef5350]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Insufficient margin. Required{" "}
                <span className="font-mono font-bold">${formatPrice(marginRequired)}</span> but only{" "}
                <span className="font-mono font-bold">${formatPrice(availableMargin)}</span> available.
              </span>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div
          className="flex gap-3 px-5 pb-5"
        >
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest transition-all bg-[#2a2e39] text-[#b2b5be] hover:bg-[#363a45] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || marginWarning}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              isBuy
                ? "bg-[#26a69a] hover:bg-[#2bbb9d] active:bg-[#1f8f84] shadow-[0_2px_8px_#26a69a33]"
                : "bg-[#ef5350] hover:bg-[#f26360] active:bg-[#d44a48] shadow-[0_2px_8px_#ef535033]"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Placing...
              </span>
            ) : (
              `Confirm ${side}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
