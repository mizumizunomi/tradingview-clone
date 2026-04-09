"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Landmark, CreditCard, Bitcoin, CheckCircle, X, Loader2, ArrowUpCircle, RefreshCw, Beaker } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "WIRE_TRANSFER", label: "Bank Transfer", icon: Landmark, desc: "1-3 business days • No fee" },
  { id: "DEBIT_CARD", label: "Credit / Debit Card", icon: CreditCard, desc: "Instant • No fee" },
  { id: "CRYPTO", label: "Crypto", icon: Bitcoin, desc: "BTC, ETH, USDT • Instant" },
];

const PRESETS = [250, 500, 1000, 5000, 10000];

const TIER_COLORS: Record<string, string> = {
  DEFAULT: "#2962ff",
  SILVER: "#b2b5be",
  GOLD: "#f59e0b",
  PLATINUM: "#a78bfa",
};

type DepositStep = "form" | "processing" | "success";

interface DepositResponse {
  wallet: {
    id: string;
    balance: number;
    equity: number;
    freeMargin: number;
    margin: number;
    marginLevel: number;
  };
  subscription: {
    tier: string;
    totalDeposited: number;
  };
  tierUpgraded: boolean;
  newTier: string | null;
}

export default function DepositPage() {
  const router = useRouter();
  const { token, wallet, setWallet, user } = useTradingStore();
  const [method, setMethod] = useState("DEBIT_CARD");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<DepositStep>("form");
  const [error, setError] = useState<string | null>(null);
  const [depositResult, setDepositResult] = useState<DepositResponse | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  // Subscription info
  const [subscription, setSubscription] = useState<{ tier: string; totalDeposited: number } | null>(null);
  const [demoResetting, setDemoResetting] = useState(false);

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    // Load wallet and plan info
    const load = async () => {
      try {
        const [walletRes, planRes] = await Promise.all([
          api.get(endpoints.wallet),
          api.get(endpoints.planSummary).catch(() => null),
        ]);
        setWallet(walletRes.data);
        if (planRes) setSubscription(planRes.data.subscription);
      } catch {}
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount >= 50 && parsedAmount <= 100000;

  const handleDeposit = async () => {
    if (!isValidAmount) {
      setError(parsedAmount < 50 ? "Minimum deposit is $50" : "Maximum deposit is $100,000");
      return;
    }
    setError(null);
    setStep("processing");

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 2500));

    try {
      const res = await api.post<DepositResponse>(endpoints.depositAccount, {
        amount: parsedAmount,
        method,
      });
      setDepositResult(res.data);
      setWallet(res.data.wallet);
      setSubscription(res.data.subscription);
      setStep("success");

      if (res.data.tierUpgraded && res.data.newTier) {
        setTimeout(() => setShowTierModal(true), 800);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Deposit failed. Please try again.";
      setError(message);
      setStep("form");
    }
  };

  const handleDemoReset = async () => {
    if (!confirm("Reset demo balance to $10,000? All open positions will be closed.")) return;
    setDemoResetting(true);
    try {
      const res = await api.post(endpoints.demoReset);
      setWallet(res.data.wallet);
      setSubscription(null);
    } catch { /* ignore */ }
    finally { setDemoResetting(false); }
  };

  const tierLabel = subscription?.tier ?? "NONE";
  const isNoneTier = tierLabel === "NONE";
  const totalDeposited = subscription?.totalDeposited ?? 0;
  const nextThreshold = isNoneTier ? 250 : tierLabel === "DEFAULT" ? 2500 : tierLabel === "SILVER" ? 10000 : tierLabel === "GOLD" ? 50000 : null;
  const progressToNext = nextThreshold
    ? Math.min(100, (totalDeposited / nextThreshold) * 100)
    : 100;

  return (
    <div className="min-h-screen" style={{ background: "#131722", color: "#d1d4dc" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b px-6 py-4"
        style={{ borderColor: "#2a2e39", background: "#1e222d" }}
      >
        <ArrowUpCircle className="h-5 w-5 text-[#26a69a]" />
        <h1 className="text-lg font-bold text-white">Deposit Funds</h1>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span style={{ color: "#b2b5be" }}>Balance:</span>
          <span className="font-mono font-semibold text-white">
            ${wallet ? formatPrice(wallet.balance) : "0.00"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-6 space-y-5">
        {/* Demo account card */}
        <div className="rounded-xl border p-4 flex items-center justify-between gap-4"
          style={{ borderColor: "#f59e0b40", background: "#f59e0b0a" }}>
          <div className="flex items-center gap-3">
            <Beaker className="h-5 w-5 shrink-0" style={{ color: "#f59e0b" }} />
            <div>
              <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>Demo Account</div>
              <div className="text-xs mt-0.5" style={{ color: "#b2b5be" }}>
                Reset your balance to $10,000 virtual funds to practice trading risk-free.
              </div>
            </div>
          </div>
          <button
            onClick={handleDemoReset}
            disabled={demoResetting}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}
          >
            {demoResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {demoResetting ? "Resetting…" : "Reset Balance"}
          </button>
        </div>

        {/* Tier progress card */}
        {subscription && (
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "#2a2e39", background: "#1e222d" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase" style={{ color: "#b2b5be" }}>
                Account Tier
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  background: `${TIER_COLORS[tierLabel] ?? "#5d6673"}22`,
                  color: TIER_COLORS[tierLabel] ?? "#b2b5be",
                }}
              >
                {tierLabel}
              </span>
            </div>
            {nextThreshold && (
              <>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "#b2b5be" }}>
                  <span>${totalDeposited.toLocaleString()} deposited</span>
                  <span>${nextThreshold.toLocaleString()} for next tier</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "#2a2e39" }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressToNext}%`,
                      background: TIER_COLORS[tierLabel] ?? "#2962ff",
                    }}
                  />
                </div>
              </>
            )}
            {isNoneTier && (
              <p className="mt-2 text-xs" style={{ color: "#f59e0b" }}>
                Deposit minimum $250 to activate trading and unlock DEFAULT tier benefits.
              </p>
            )}
          </div>
        )}

        {/* Step: processing */}
        {step === "processing" && (
          <div
            className="rounded-xl border p-12 flex flex-col items-center gap-4"
            style={{ borderColor: "#2a2e39", background: "#1e222d" }}
          >
            <Loader2 className="h-12 w-12 animate-spin text-[#2962ff]" />
            <p className="text-lg font-semibold text-white">Processing your deposit…</p>
            <p className="text-sm" style={{ color: "#b2b5be" }}>
              Please do not close this window.
            </p>
          </div>
        )}

        {/* Step: success */}
        {step === "success" && depositResult && (
          <div
            ref={confettiRef}
            className="rounded-xl border p-10 flex flex-col items-center gap-4 relative overflow-hidden"
            style={{ borderColor: "#26a69a44", background: "#1e222d" }}
          >
            {/* CSS confetti */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {Array.from({ length: 30 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${(i * 37) % 100}%`,
                    top: "-10px",
                    width: 8,
                    height: 8,
                    borderRadius: i % 2 === 0 ? "50%" : "2px",
                    background: ["#2962ff","#26a69a","#f59e0b","#a78bfa","#ef5350"][i % 5],
                    animation: `confettiFall ${1.5 + (i % 5) * 0.3}s ease-in ${(i * 0.07)}s both`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes confettiFall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
              }
            `}</style>

            <CheckCircle className="h-16 w-16 text-[#26a69a]" />
            <p className="text-2xl font-bold text-white">Deposit Successful!</p>
            <p className="text-3xl font-mono font-bold text-[#26a69a]">
              +${formatPrice(parsedAmount)}
            </p>
            <div className="w-full mt-2 space-y-2 rounded-lg p-4" style={{ background: "#131722" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#b2b5be" }}>New Balance</span>
                <span className="font-mono font-semibold text-white">
                  ${formatPrice(depositResult.wallet.balance)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#b2b5be" }}>Free Margin</span>
                <span className="font-mono font-semibold text-white">
                  ${formatPrice(depositResult.wallet.freeMargin)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#b2b5be" }}>Total Deposited</span>
                <span className="font-mono font-semibold text-white">
                  ${formatPrice(depositResult.subscription.totalDeposited)}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-2 w-full">
              <button
                onClick={() => { setStep("form"); setAmount(""); }}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-[#2a2e39]"
                style={{ borderColor: "#363a45", color: "#b2b5be" }}
              >
                Make Another Deposit
              </button>
              <button
                onClick={() => router.push("/trade")}
                className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1e4dd8]"
                style={{ background: "#2962ff" }}
              >
                Start Trading
              </button>
            </div>
          </div>
        )}

        {/* Step: form */}
        {step === "form" && (
          <div
            className="rounded-xl border p-6 space-y-5"
            style={{ borderColor: "#2a2e39", background: "#1e222d" }}
          >
            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-2" style={{ color: "#5d6673" }}>
                Payment Method
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
                        ? { borderColor: "#2962ff", background: "#2962ff15", color: "white" }
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
                  min={50}
                  max={100000}
                  step="0.01"
                  className="w-full rounded-lg border bg-transparent py-3 pl-7 pr-4 text-lg font-mono text-white outline-none transition-colors focus:border-[#2962ff]"
                  style={{ borderColor: error ? "#ef5350" : "#363a45" }}
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: "#5d6673" }}>
                Min $50 • Max $100,000 per transaction
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setAmount(p.toString()); setError(null); }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:border-[#2962ff] hover:text-white"
                  style={
                    amount === p.toString()
                      ? { borderColor: "#2962ff", background: "#2962ff15", color: "white" }
                      : { borderColor: "#363a45", color: "#b2b5be" }
                  }
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>

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
              onClick={handleDeposit}
              disabled={!parsedAmount}
              className="w-full rounded-lg py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#2962ff" }}
            >
              {parsedAmount > 0 ? `Deposit $${parsedAmount.toLocaleString()}` : "Enter Amount"}
            </button>
          </div>
        )}
      </div>

      {/* Tier upgrade modal */}
      {showTierModal && depositResult?.newTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="relative rounded-2xl border p-8 text-center max-w-sm w-full"
            style={{
              borderColor: TIER_COLORS[depositResult.newTier] ?? "#2962ff",
              background: "#1e222d",
              boxShadow: `0 0 40px ${TIER_COLORS[depositResult.newTier] ?? "#2962ff"}44`,
            }}
          >
            <button
              onClick={() => setShowTierModal(false)}
              className="absolute right-3 top-3 rounded-full p-1 hover:bg-[#2a2e39]"
              style={{ color: "#b2b5be" }}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-5xl mb-4">
              {depositResult.newTier === "PLATINUM" ? "💎" :
               depositResult.newTier === "GOLD" ? "🥇" :
               depositResult.newTier === "SILVER" ? "🥈" : "⭐"}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Tier Upgraded!</h2>
            <p className="text-sm mb-4" style={{ color: "#b2b5be" }}>
              Congratulations! You&apos;ve been upgraded to
            </p>
            <span
              className="inline-block rounded-full px-4 py-1.5 text-lg font-bold mb-4"
              style={{
                background: `${TIER_COLORS[depositResult.newTier] ?? "#2962ff"}22`,
                color: TIER_COLORS[depositResult.newTier] ?? "#2962ff",
              }}
            >
              {depositResult.newTier} Tier
            </span>
            <p className="text-xs mb-6" style={{ color: "#5d6673" }}>
              Your account now has access to additional features and benefits.
            </p>
            <button
              onClick={() => setShowTierModal(false)}
              className="w-full rounded-lg py-2.5 text-sm font-bold text-white"
              style={{ background: TIER_COLORS[depositResult.newTier] ?? "#2962ff" }}
            >
              Continue Trading
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
