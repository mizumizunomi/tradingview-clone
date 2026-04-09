"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, CreditCard, Bitcoin, CheckCircle, X, Loader2, ArrowDownCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "WIRE_TRANSFER", label: "Bank Transfer", icon: Landmark, desc: "1-3 business days" },
  { id: "DEBIT_CARD", label: "Credit / Debit Card", icon: CreditCard, desc: "Instant" },
  { id: "CRYPTO", label: "Crypto", icon: Bitcoin, desc: "BTC, ETH, USDT" },
];

const PRESETS = [100, 500, 1000];

type WithdrawStep = "form" | "processing" | "success";

interface WithdrawResponse {
  wallet: {
    id: string;
    balance: number;
    equity: number;
    freeMargin: number;
    margin: number;
    marginLevel: number;
  };
  fee: number;
  warning: string | null;
}

export default function WithdrawPage() {
  const router = useRouter();
  const { token, wallet, setWallet } = useTradingStore();
  const [method, setMethod] = useState("WIRE_TRANSFER");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<WithdrawStep>("form");
  const [error, setError] = useState<string | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(null);

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    const load = async () => {
      try {
        const res = await api.get(endpoints.wallet);
        setWallet(res.data);
      } catch {}
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const parsedAmount = parseFloat(amount) || 0;
  const freeMargin = wallet?.freeMargin ?? 0;
  const fee = parsedAmount > 0 ? Math.max(1, parsedAmount * 0.005) : 0;
  const netAmount = Math.max(0, parsedAmount - fee);
  const isValidAmount = parsedAmount >= 10 && parsedAmount + fee <= freeMargin;

  const handleWithdraw = async () => {
    if (parsedAmount < 10) { setError("Minimum withdrawal is $10"); return; }
    if (parsedAmount + fee > freeMargin) { setError("Insufficient free margin (including fee)"); return; }
    setError(null);
    setStep("processing");

    await new Promise((r) => setTimeout(r, 2000));

    try {
      const res = await api.post<WithdrawResponse>(endpoints.withdrawAccount, {
        amount: parsedAmount,
        method,
      });
      setWithdrawResult(res.data);
      setWallet(res.data.wallet);
      setStep("success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Withdrawal failed. Please try again.";
      setError(message);
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#131722", color: "#d1d4dc" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b px-6 py-4"
        style={{ borderColor: "#2a2e39", background: "#1e222d" }}
      >
        <ArrowDownCircle className="h-5 w-5 text-[#ef5350]" />
        <h1 className="text-lg font-bold text-white">Withdraw Funds</h1>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span style={{ color: "#b2b5be" }}>Available:</span>
          <span className="font-mono font-semibold text-white">
            ${wallet ? formatPrice(wallet.freeMargin) : "0.00"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-6 space-y-5">
        {/* KYC notice */}
        <div className="flex items-start gap-3 rounded-xl border p-4"
          style={{ borderColor: "#2962ff40", background: "#2962ff08" }}>
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#4d7cff" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "#4d7cff" }}>Identity Verification Required</p>
            <p className="text-xs mt-0.5" style={{ color: "#b2b5be" }}>
              Withdrawals require approved KYC verification.{" "}
              <Link href="/account/kyc" className="underline hover:text-white transition-colors">Complete KYC</Link>
              {" "}to unlock withdrawals.
            </p>
          </div>
        </div>

        {/* Balance overview */}
        {wallet && (
          <div
            className="grid grid-cols-2 gap-3 rounded-xl border p-4"
            style={{ borderColor: "#2a2e39", background: "#1e222d" }}
          >
            {[
              { label: "Balance", value: wallet.balance },
              { label: "Free Margin", value: wallet.freeMargin, highlight: true },
              { label: "Equity", value: wallet.equity },
              { label: "Used Margin", value: wallet.margin },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs" style={{ color: "#5d6673" }}>{item.label}</div>
                <div
                  className="font-mono font-semibold"
                  style={{ color: item.highlight ? "#26a69a" : "white" }}
                >
                  ${formatPrice(item.value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Processing state */}
        {step === "processing" && (
          <div
            className="rounded-xl border p-12 flex flex-col items-center gap-4"
            style={{ borderColor: "#2a2e39", background: "#1e222d" }}
          >
            <Loader2 className="h-12 w-12 animate-spin text-[#ef5350]" />
            <p className="text-lg font-semibold text-white">Processing withdrawal…</p>
            <p className="text-sm" style={{ color: "#b2b5be" }}>Please do not close this window.</p>
          </div>
        )}

        {/* Success state */}
        {step === "success" && withdrawResult && (
          <div
            className="rounded-xl border p-10 flex flex-col items-center gap-4"
            style={{ borderColor: "#26a69a44", background: "#1e222d" }}
          >
            <CheckCircle className="h-16 w-16 text-[#26a69a]" />
            <p className="text-2xl font-bold text-white">Withdrawal Successful!</p>
            <p className="text-3xl font-mono font-bold text-[#26a69a]">
              -${formatPrice(parsedAmount)}
            </p>

            <div className="w-full space-y-2 rounded-lg p-4" style={{ background: "#131722" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#b2b5be" }}>Amount</span>
                <span className="font-mono text-white">${formatPrice(parsedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#b2b5be" }}>Fee (0.5%)</span>
                <span className="font-mono text-[#ef5350]">-${formatPrice(withdrawResult.fee)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-semibold" style={{ borderColor: "#2a2e39" }}>
                <span style={{ color: "#b2b5be" }}>You Receive</span>
                <span className="font-mono text-white">${formatPrice(parsedAmount - withdrawResult.fee)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span style={{ color: "#b2b5be" }}>New Balance</span>
                <span className="font-mono text-white">${formatPrice(withdrawResult.wallet.balance)}</span>
              </div>
            </div>

            {/* Warning */}
            {withdrawResult.warning && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm w-full"
                style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {withdrawResult.warning}
              </div>
            )}

            <div className="flex gap-3 mt-2 w-full">
              <button
                onClick={() => { setStep("form"); setAmount(""); }}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-[#2a2e39]"
                style={{ borderColor: "#363a45", color: "#b2b5be" }}
              >
                Withdraw More
              </button>
              <button
                onClick={() => router.push("/account/deposit")}
                className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white"
                style={{ background: "#2962ff" }}
              >
                Deposit
              </button>
            </div>
          </div>
        )}

        {/* Form state */}
        {step === "form" && (
          <div
            className="rounded-xl border p-6 space-y-5"
            style={{ borderColor: "#2a2e39", background: "#1e222d" }}
          >
            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "#5d6673" }}>
                Withdraw To
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all"
                    style={
                      method === m.id
                        ? { borderColor: "#ef5350", background: "#ef535015", color: "white" }
                        : { borderColor: "#363a45", color: "#b2b5be" }
                    }
                  >
                    <m.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{m.label}</span>
                    <span className="text-[10px]" style={{ color: "#5d6673" }}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "#5d6673" }}>
                Amount (USD)
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: "#b2b5be" }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(null); }}
                  placeholder="0.00"
                  min={10}
                  max={freeMargin}
                  step="0.01"
                  className="w-full rounded-lg border bg-transparent py-3 pl-7 pr-4 text-lg font-mono text-white outline-none transition-colors focus:border-[#ef5350]"
                  style={{ borderColor: error ? "#ef5350" : "#363a45" }}
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: "#5d6673" }}>
                Min $10 • Max ${formatPrice(freeMargin)} (free margin)
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setAmount(p.toString()); setError(null); }}
                  disabled={p > freeMargin}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:border-[#ef5350] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    amount === p.toString()
                      ? { borderColor: "#ef5350", background: "#ef535015", color: "white" }
                      : { borderColor: "#363a45", color: "#b2b5be" }
                  }
                >
                  ${p.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  // Set amount such that amount + fee = freeMargin → amount = freeMargin / 1.005
                  const maxAmount = freeMargin / 1.005;
                  setAmount(Math.max(0, maxAmount).toFixed(2));
                  setError(null);
                }}
                disabled={freeMargin < 10}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:border-[#ef5350] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderColor: "#363a45", color: "#b2b5be" }}
              >
                All
              </button>
            </div>

            {/* Fee breakdown */}
            {parsedAmount > 0 && (
              <div
                className="rounded-lg p-3 space-y-1.5 text-sm"
                style={{ background: "#131722" }}
              >
                <div className="flex justify-between">
                  <span style={{ color: "#b2b5be" }}>Withdrawal Amount</span>
                  <span className="font-mono text-white">${formatPrice(parsedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#b2b5be" }}>Fee (0.5%, min $1)</span>
                  <span className="font-mono text-[#ef5350]">-${formatPrice(fee)}</span>
                </div>
                <div
                  className="border-t pt-1.5 flex justify-between font-semibold"
                  style={{ borderColor: "#2a2e39" }}
                >
                  <span style={{ color: "#d1d4dc" }}>Net Amount You&apos;ll Receive</span>
                  <span className="font-mono text-[#26a69a]">${formatPrice(netAmount)}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: "#ef535022", color: "#ef5350" }}
              >
                <X className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleWithdraw}
              disabled={!isValidAmount}
              className="w-full rounded-lg py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#ef5350" }}
            >
              {parsedAmount > 0
                ? `Withdraw $${formatPrice(parsedAmount)}`
                : "Enter Amount"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
