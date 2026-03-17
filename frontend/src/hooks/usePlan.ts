"use client";
import { useTradingStore } from "@/store/trading.store";
import { PlanTier } from "@/types";

// Tier order for comparison
const TIER_ORDER: PlanTier[] = ['NONE', 'DEFAULT', 'SILVER', 'GOLD', 'PLATINUM'];

const TIER_CONFIG_FE = {
  NONE: { maxPositions: 0, maxLeverage: 1, canTrade: false, canTradeCrypto: false, depositRequired: 0, label: 'No Plan', color: '#5d6673' },
  DEFAULT: { maxPositions: 3, maxLeverage: 3, canTrade: true, canTradeCrypto: false, depositRequired: 250, label: 'Default', color: '#64748b' },
  SILVER: { maxPositions: 5, maxLeverage: 5, canTrade: true, canTradeCrypto: true, depositRequired: 2500, label: 'Silver', color: '#94a3b8' },
  GOLD: { maxPositions: 20, maxLeverage: 20, canTrade: true, canTradeCrypto: true, depositRequired: 10000, label: 'Gold', color: '#f59e0b' },
  PLATINUM: { maxPositions: 999, maxLeverage: 100, canTrade: true, canTradeCrypto: true, depositRequired: 50000, label: 'Platinum', color: '#a78bfa' },
};

// Map User.plan string to PlanTier
function planToTier(plan: string | undefined): PlanTier {
  const map: Record<string, PlanTier> = {
    none: 'NONE', default: 'DEFAULT', silver: 'SILVER', gold: 'GOLD', platinum: 'PLATINUM',
  };
  return map[plan?.toLowerCase() ?? 'none'] ?? 'NONE';
}

export function usePlan() {
  const { user } = useTradingStore();

  // Prefer subscription.tier, fall back to user.plan string
  const tier: PlanTier = (user?.subscription?.tier as PlanTier) ?? planToTier(user?.plan);
  const config = TIER_CONFIG_FE[tier] ?? TIER_CONFIG_FE.NONE;

  const hasAtLeastTier = (required: PlanTier): boolean => {
    return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required);
  };

  const isFeatureLocked = (required: PlanTier): boolean => !hasAtLeastTier(required);

  const canTrade = config.canTrade;
  const canTradeCrypto = config.canTradeCrypto;
  const maxLeverage = config.maxLeverage;
  const depositRequired = config.depositRequired;

  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] as PlanTier | undefined;
  const nextTierConfig = nextTier ? TIER_CONFIG_FE[nextTier] : null;

  return {
    tier,
    config,
    canTrade,
    canTradeCrypto,
    maxLeverage,
    depositRequired,
    hasAtLeastTier,
    isFeatureLocked,
    nextTier,
    nextTierConfig,
    isNoPlan: tier === 'NONE',
  };
}
