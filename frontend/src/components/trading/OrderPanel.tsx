"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const LEVERAGE_PRESETS = [1, 5, 10, 25, 50, 100];

export function OrderPanel() {
  const {
    selectedAsset, prices, wallet,
    orderSide, orderType, quantity, leverage, stopLoss, takeProfit, limitPrice,
    setOrderSide, setOrderType, setQuantity, setLeverage,
    setStopLoss, setTakeProfit, setLimitPrice,
    setWallet, setPositions,
    showOrderPanel, setShowOrderPanel,
  } = useTradingStore();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const priceData = selectedAsset ? prices[selectedAsset.symbol] : null;
  const currentPrice = priceData ? (orderSide === "BUY" ? priceData.ask : priceData.bid) : 0;
  const notionalValue = currentPrice * quantity;
  const marginRequired = leverage > 0 ? notionalValue / leverage : notionalValue;
  const commission = notionalValue * (selectedAsset?.commission || 0.0005);
  const spread = (priceData?.ask || 0) - (priceData?.bid || 0);
  const spreadPoints = spread * 100000;
  const isBuy = orderSide === "BUY";

  const handlePlaceOrder = async () => {
    if (!selectedAsset) return setMessage({ type: "error", text: "Select a symbol first" });
    if (quantity <= 0) return setMessage({ type: "error", text: "Invalid quantity" });
    setLoading(true);
    setMessage(null);
    try {
      await api.post(endpoints.placeOrder, {
        assetId: selectedAsset.id,
        symbol: selectedAsset.symbol,
        side: orderSide,
        type: orderType,
        quantity,
        leverage,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      });
      const [posRes, walletRes] = await Promise.all([
        api.get(endpoints.positions),
        api.get(endpoints.wallet),
      ]);
      setPositions(posRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })));
      setWallet(walletRes.data);
      setMessage({ type: "success", text: `${orderSide} order executed` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Order failed" });
    } finally {
      setLoading(false);
    }
  };

  if (!showOrderPanel) {
    return (
      <div
        className="flex h-full flex-col items-center justify-start pt-2 bg-[#1e222d] cursor-pointer"
        style={{ width: 24, minWidth: 24, borderLeft: "1px solid #363a45" }}
        onClick={() => setShowOrderPanel(true)}
        title="Open Order Panel"
      >
        <ChevronLeft className="h-4 w-4 text-[#5d6673] hover:text-white transition-colors mt-1" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col bg-[#1e222d]"
      style={{ width: 240, minWidth: 200, borderLeft: "1px solid #363a45" }}
    >
      {/* Panel header with collapse button */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5d6673]">Order Panel</span>
        <button onClick={() => setShowOrderPanel(false)} title="Collapse" className="p-0.5 rounded hover:bg-[#363a45] text-[#5d6673] hover:text-white transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Bid/Ask header */}
      <div className="px-3 pt-3 pb-2">
        {priceData ? (
          <div className="flex gap-2">
            <div className="flex-1 rounded bg-[#ef535015] border border-[#ef535030] px-2 py-1.5 text-center">
              <div className="text-[10px] text-[#5d6673] uppercase tracking-wider mb-0.5">Bid</div>
              <div className="font-mono text-sm font-bold text-[#ef5350]">
                {priceData.bid < 10 ? priceData.bid.toFixed(5) : priceData.bid.toFixed(2)}
              </div>
            </div>
            <div className="flex-1 rounded bg-[#26a69a15] border border-[#26a69a30] px-2 py-1.5 text-center">
              <div className="text-[10px] text-[#5d6673] uppercase tracking-wider mb-0.5">Ask</div>
              <div className="font-mono text-sm font-bold text-[#26a69a]">
                {priceData.ask < 10 ? priceData.ask.toFixed(5) : priceData.ask.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 rounded bg-[#2a2e39] border border-[#363a45] px-2 py-1.5 text-center">
              <div className="text-[10px] text-[#5d6673] uppercase tracking-wider mb-0.5">Bid</div>
              <div className="font-mono text-sm font-bold text-[#5d6673]">—</div>
            </div>
            <div className="flex-1 rounded bg-[#2a2e39] border border-[#363a45] px-2 py-1.5 text-center">
              <div className="text-[10px] text-[#5d6673] uppercase tracking-wider mb-0.5">Ask</div>
              <div className="font-mono text-sm font-bold text-[#5d6673]">—</div>
            </div>
          </div>
        )}
        {priceData && (
          <div className="mt-1 text-center text-[10px] text-[#5d6673]">
            Spread: <span className="text-[#b2b5be]">{spreadPoints.toFixed(1)} pts</span>
          </div>
        )}
      </div>

      {/* BUY / SELL toggle */}
      <div className="mx-3 mb-3 flex rounded overflow-hidden border border-[#363a45]">
        <button
          onClick={() => setOrderSide("BUY")}
          className={cn(
            "flex-1 py-2 text-xs font-bold tracking-widest uppercase transition-all",
            isBuy
              ? "bg-[#26a69a] text-white shadow-inner"
              : "bg-[#1e222d] text-[#26a69a] hover:bg-[#26a69a18]"
          )}
        >
          Buy
        </button>
        <div className="w-px bg-[#363a45]" />
        <button
          onClick={() => setOrderSide("SELL")}
          className={cn(
            "flex-1 py-2 text-xs font-bold tracking-widest uppercase transition-all",
            !isBuy
              ? "bg-[#ef5350] text-white shadow-inner"
              : "bg-[#1e222d] text-[#ef5350] hover:bg-[#ef535018]"
          )}
        >
          Sell
        </button>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-3">
        {/* Order type */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#5d6673]">
            Order Type
          </label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as any)}
            className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-2 py-1.5 text-xs text-[#d1d4dc] outline-none hover:border-[#434651] focus:border-[#2962ff] cursor-pointer"
          >
            <option value="MARKET">Market Order</option>
            <option value="LIMIT">Limit Order</option>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#5d6673]">
            Volume (Lots)
          </label>
          <div className="flex rounded border border-[#363a45] overflow-hidden hover:border-[#434651] focus-within:border-[#2962ff]">
            <button
              onClick={() => setQuantity(Math.max(0.01, parseFloat((quantity - 0.01).toFixed(2))))}
              className="px-2.5 bg-[#2a2e39] text-[#b2b5be] hover:bg-[#363a45] hover:text-white text-base leading-none select-none"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0.01)}
              min="0.01"
              step="0.01"
              className="flex-1 bg-[#2a2e39] px-2 py-1.5 text-center text-xs font-mono text-white outline-none w-0"
            />
            <button
              onClick={() => setQuantity(parseFloat((quantity + 0.01).toFixed(2)))}
              className="px-2.5 bg-[#2a2e39] text-[#b2b5be] hover:bg-[#363a45] hover:text-white text-base leading-none select-none"
            >
              +
            </button>
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[#5d6673]">Leverage</label>
            <span className="rounded bg-[#2962ff22] px-1.5 py-0.5 text-[11px] font-bold text-[#2962ff]">{leverage}×</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #2962ff ${leverage}%, #363a45 ${leverage}%)`,
            }}
          />
          <div className="mt-1.5 flex gap-1">
            {LEVERAGE_PRESETS.map((l) => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={cn(
                  "flex-1 rounded py-0.5 text-[9px] font-medium transition-colors",
                  leverage === l
                    ? "bg-[#2962ff] text-white"
                    : "bg-[#2a2e39] text-[#5d6673] hover:bg-[#363a45] hover:text-[#b2b5be]"
                )}
              >
                {l}×
              </button>
            ))}
          </div>
        </div>

        {/* Limit price */}
        {orderType === "LIMIT" && (
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#5d6673]">
              Limit Price
            </label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={currentPrice > 0 ? currentPrice.toFixed(5) : "0.00000"}
              className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-2.5 py-1.5 text-xs font-mono text-white outline-none hover:border-[#434651] focus:border-[#2962ff] placeholder:text-[#5d6673]"
            />
          </div>
        )}

        {/* SL / TP row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#5d6673]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ef5350] inline-block" />
              Stop Loss
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="—"
              className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-2 py-1.5 text-xs font-mono text-white outline-none hover:border-[#ef535050] focus:border-[#ef5350] placeholder:text-[#5d6673]"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#5d6673]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#26a69a] inline-block" />
              Take Profit
            </label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="—"
              className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-2 py-1.5 text-xs font-mono text-white outline-none hover:border-[#26a69a50] focus:border-[#26a69a] placeholder:text-[#5d6673]"
            />
          </div>
        </div>

        {/* Order summary card */}
        <div className="rounded border border-[#363a45] overflow-hidden">
          <div className="bg-[#131722] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5d6673]">
            Order Summary
          </div>
          <div className="bg-[#131722] border-t border-[#363a45] divide-y divide-[#1e222d]">
            {[
              { label: "Entry Price", value: currentPrice > 0 ? (currentPrice < 10 ? currentPrice.toFixed(5) : currentPrice.toFixed(2)) : "—" },
              { label: "Notional", value: `$${formatPrice(notionalValue)}` },
              { label: "Margin Req.", value: `$${formatPrice(marginRequired)}`, highlight: true },
              { label: "Commission", value: `$${formatPrice(commission)}` },
              { label: "Spread", value: `${spreadPoints.toFixed(1)} pts` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex justify-between px-2.5 py-1.5">
                <span className="text-[11px] text-[#5d6673]">{label}</span>
                <span className={cn("text-[11px] font-mono", highlight ? "text-[#f59e0b]" : "text-[#d1d4dc]")}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet mini */}
        {wallet && (
          <div className="rounded border border-[#363a45] overflow-hidden">
            <div className="bg-[#131722] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5d6673]">
              Account
            </div>
            <div className="bg-[#131722] border-t border-[#363a45] divide-y divide-[#1e222d]">
              {[
                { label: "Balance", value: `$${formatPrice(wallet.balance)}` },
                { label: "Equity", value: `$${formatPrice(wallet.equity)}` },
                {
                  label: "Free Margin",
                  value: `$${formatPrice(wallet.freeMargin)}`,
                  color: wallet.freeMargin >= marginRequired ? "#26a69a" : "#ef5350",
                },
                { label: "Margin Used", value: `$${formatPrice(wallet.margin)}` },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between px-2.5 py-1.5">
                  <span className="text-[11px] text-[#5d6673]">{label}</span>
                  <span className="text-[11px] font-mono" style={{ color: color || "#d1d4dc" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={cn(
            "flex items-center gap-2 rounded px-3 py-2 text-xs",
            message.type === "success"
              ? "bg-[#26a69a15] border border-[#26a69a40] text-[#26a69a]"
              : "bg-[#ef535015] border border-[#ef535040] text-[#ef5350]"
          )}>
            {message.type === "success"
              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Place order button */}
      <div className="p-3 border-t border-[#363a45]">
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !selectedAsset}
          className={cn(
            "w-full rounded py-3 text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed",
            isBuy
              ? "bg-[#26a69a] hover:bg-[#2bbb9d] active:bg-[#1f8f84] shadow-[0_2px_8px_#26a69a33]"
              : "bg-[#ef5350] hover:bg-[#f26360] active:bg-[#d44a48] shadow-[0_2px_8px_#ef535033]"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Executing...
            </span>
          ) : (
            `${isBuy ? "Buy" : "Sell"} ${selectedAsset?.symbol || "—"}`
          )}
        </button>
      </div>
    </div>
  );
}
