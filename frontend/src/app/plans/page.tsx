"use client";
import { useRouter } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { Check, Zap, Shield, Crown, Star, Gem, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { PlanTier } from "@/types";

const PLANS: {
  id: PlanTier;
  name: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  bgGlow: string;
  depositRequired: number;
  monthlyFee: number;
  maxLeverage: number;
  commission: string;
  maxPositions: number;
  features: string[];
  popular: boolean;
}[] = [
  {
    id: "DEFAULT",
    name: "Default",
    tagline: "Start trading today",
    icon: Shield,
    color: "#64748b",
    bgGlow: "#64748b22",
    depositRequired: 250,
    monthlyFee: 0,
    maxLeverage: 3,
    commission: "0.1%",
    maxPositions: 3,
    features: [
      "Minimum deposit: $250",
      "3× max leverage",
      "Up to 3 open positions",
      "8 tradeable assets",
      "FOREX trading",
      "Basic indicators (SMA, EMA, RSI)",
      "Market & Limit orders",
      "No monthly fee",
    ],
    popular: false,
  },
  {
    id: "SILVER",
    name: "Silver",
    tagline: "For growing traders",
    icon: Star,
    color: "#94a3b8",
    bgGlow: "#94a3b822",
    depositRequired: 2500,
    monthlyFee: 29,
    maxLeverage: 5,
    commission: "0.1%",
    maxPositions: 5,
    features: [
      "Minimum deposit: $2,500",
      "5× max leverage",
      "Up to 5 open positions",
      "20 tradeable assets",
      "FOREX + Crypto trading",
      "Advanced indicators (+ MACD, BB)",
      "Market, Limit & Stop-Loss orders",
      "Bot signals access",
    ],
    popular: false,
  },
  {
    id: "GOLD",
    name: "Gold",
    tagline: "Most popular choice",
    icon: Gem,
    color: "#f59e0b",
    bgGlow: "#f59e0b22",
    depositRequired: 10000,
    monthlyFee: 199,
    maxLeverage: 20,
    commission: "0.05%",
    maxPositions: 20,
    features: [
      "Minimum deposit: $10,000",
      "20× max leverage",
      "Up to 20 open positions",
      "80 tradeable assets",
      "FOREX + Crypto + Stocks",
      "All indicators",
      "All order types + Take-Profit",
      "Full bot access + 50 backtests",
    ],
    popular: true,
  },
  {
    id: "PLATINUM",
    name: "Platinum",
    tagline: "For professional traders",
    icon: Crown,
    color: "#a78bfa",
    bgGlow: "#a78bfa22",
    depositRequired: 50000,
    monthlyFee: 499,
    maxLeverage: 100,
    commission: "0.01%",
    maxPositions: 999,
    features: [
      "Minimum deposit: $50,000",
      "100× max leverage",
      "Unlimited open positions",
      "All assets (999+)",
      "All asset categories",
      "All indicators",
      "All order types + OCO",
      "Premium bot + unlimited backtests",
    ],
    popular: false,
  },
];

const COMPARISON_ROWS = [
  { feature: "Min. Deposit", DEFAULT: "$250", SILVER: "$2,500", GOLD: "$10,000", PLATINUM: "$50,000" },
  { feature: "Monthly Fee", DEFAULT: "Free", SILVER: "$29/mo", GOLD: "$199/mo", PLATINUM: "$499/mo" },
  { feature: "Max Leverage", DEFAULT: "3×", SILVER: "5×", GOLD: "20×", PLATINUM: "100×" },
  { feature: "Open Positions", DEFAULT: "3", SILVER: "5", GOLD: "20", PLATINUM: "Unlimited" },
  { feature: "Assets Available", DEFAULT: "8", SILVER: "20", GOLD: "80", PLATINUM: "All" },
  { feature: "Commission", DEFAULT: "0.1%", SILVER: "0.1%", GOLD: "0.05%", PLATINUM: "0.01%" },
  { feature: "Crypto Trading", DEFAULT: "✗", SILVER: "✓", GOLD: "✓", PLATINUM: "✓" },
  { feature: "Stocks Trading", DEFAULT: "✗", SILVER: "✗", GOLD: "✓", PLATINUM: "✓" },
  { feature: "Order Types", DEFAULT: "Market, Limit", SILVER: "+ Stop Loss", GOLD: "+ Take Profit", PLATINUM: "+ OCO" },
  { feature: "Bot Access", DEFAULT: "✗", SILVER: "Signals", GOLD: "Full", PLATINUM: "Premium" },
  { feature: "Backtests", DEFAULT: "✗", SILVER: "✗", GOLD: "50/mo", PLATINUM: "Unlimited" },
];

export default function PlansPage() {
  const router = useRouter();
  const { tier: activeTier } = usePlan();

  const handleUpgrade = (planId: PlanTier, depositRequired: number) => {
    if (planId === activeTier) return;
    router.push(`/wallet?deposit=${depositRequired}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#131722]">
      <SideNav />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-[#363a45] bg-[#1e222d] px-8 py-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-[#f59e0b]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">Investment Plans</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Choose Your Trading Tier</h1>
            <p className="text-sm text-[#5d6673]">
              Deposit to activate your plan and unlock more power, tighter spreads, and higher leverage as you grow.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8 space-y-10">
          {/* Plan cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isActive = activeTier === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-2xl border p-5 transition-all cursor-pointer",
                    plan.popular
                      ? "border-[#f59e0b] bg-[#1e222d]"
                      : "border-[#363a45] bg-[#1e222d] hover:border-[#434651]",
                    isActive && "ring-2 ring-[#2962ff] ring-offset-2 ring-offset-[#131722]"
                  )}
                  style={{ boxShadow: plan.popular ? `0 0 40px ${plan.bgGlow}` : undefined }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f59e0b] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#131722]">
                      Most Popular
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isActive && (
                    <div className="absolute top-3 right-3 rounded-full bg-[#2962ff] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Current
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-4">
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: plan.bgGlow }}
                    >
                      <Icon className="h-5 w-5" style={{ color: plan.color }} />
                    </div>
                    <div className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</div>
                    <div className="text-xs text-[#5d6673]">{plan.tagline}</div>
                  </div>

                  {/* Price */}
                  <div className="mb-4 pb-4 border-b border-[#363a45]">
                    <div className="text-2xl font-bold text-white">
                      {plan.monthlyFee === 0 ? "Free" : `$${plan.monthlyFee}/mo`}
                    </div>
                    <div className="text-xs text-[#5d6673]">
                      Min. deposit: <span className="text-[#b2b5be] font-medium">${plan.depositRequired.toLocaleString("en-US")}</span>
                    </div>
                  </div>

                  {/* Key stats */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {[
                      { label: "Leverage", value: `${plan.maxLeverage}×` },
                      { label: "Positions", value: plan.maxPositions >= 999 ? "∞" : String(plan.maxPositions) },
                      { label: "Commission", value: plan.commission },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-[#131722] px-2.5 py-2">
                        <div className="text-[10px] text-[#5d6673]">{label}</div>
                        <div className="text-xs font-bold text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <ul className="mb-5 space-y-1.5">
                    {plan.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-[#b2b5be]">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                    {plan.features.length > 6 && (
                      <li className="text-[11px] text-[#5d6673]">+{plan.features.length - 6} more features</li>
                    )}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id, plan.depositRequired)}
                    disabled={isActive}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                      isActive && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      background: isActive ? "#2962ff" : plan.popular ? plan.color : `${plan.color}20`,
                      color: isActive ? "white" : plan.popular ? "#000" : plan.color,
                    }}
                  >
                    {isActive ? "Current Plan" : `Deposit $${plan.depositRequired.toLocaleString()}`}
                    {!isActive && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Comparison table */}
          <div>
            <h2 className="text-sm font-bold text-white mb-4">Full Feature Comparison</h2>
            <div className="rounded-xl border border-[#363a45] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#363a45] bg-[#1e222d]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5d6673]">Feature</th>
                    {PLANS.map((p) => (
                      <th key={p.id} className="px-4 py-3 text-center text-xs font-bold" style={{ color: p.color }}>
                        {p.name}
                        {activeTier === p.id && (
                          <span className="ml-1.5 rounded px-1 py-0.5 text-[8px] bg-[#2962ff] text-white">You</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222d]">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-[#1e222d] transition-colors">
                      <td className="px-4 py-2.5 text-xs text-[#b2b5be]">{row.feature}</td>
                      {(["DEFAULT", "SILVER", "GOLD", "PLATINUM"] as PlanTier[]).map((tier) => (
                        <td key={tier} className="px-4 py-2.5 text-center text-xs">
                          {(row as Record<string, string>)[tier] === "✓" ? (
                            <Check className="h-3.5 w-3.5 text-[#26a69a] mx-auto" />
                          ) : (row as Record<string, string>)[tier] === "✗" ? (
                            <span className="text-[#5d6673]">—</span>
                          ) : (
                            <span className="font-medium text-[#d1d4dc]">{(row as Record<string, string>)[tier]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-[#363a45] bg-[#1e222d] p-4 text-center">
            <p className="text-xs text-[#5d6673]">
              All plans use <span className="text-[#b2b5be] font-medium">simulated funds only</span> — no real money is involved.
              Plans are activated by depositing into your trading account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
