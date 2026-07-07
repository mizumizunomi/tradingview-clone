import { StrategyDefinition, StrategyTier } from './strategy.interface';
import { TREND_STRATEGIES } from './trend-strategies';
import { REVERSAL_STRATEGIES } from './reversal-strategies';
import { BREAKOUT_STRATEGIES } from './breakout-strategies';
import { SCALPING_STRATEGIES } from './scalping-strategies';
import { COMPOSITE_STRATEGIES } from './composite-strategies';

// Tier ordering for access control comparisons
const TIER_ORDER: Record<StrategyTier, number> = {
  NONE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
};

// Master registry
const REGISTRY = new Map<string, StrategyDefinition>();

for (const strategy of [
  ...TREND_STRATEGIES,
  ...REVERSAL_STRATEGIES,
  ...BREAKOUT_STRATEGIES,
  ...SCALPING_STRATEGIES,
  ...COMPOSITE_STRATEGIES,
]) {
  REGISTRY.set(strategy.name, strategy);
}

/** All strategies in the registry */
export const ALL_STRATEGIES: StrategyDefinition[] = Array.from(REGISTRY.values());

/** Look up a strategy by name */
export function getStrategy(name: string): StrategyDefinition | undefined {
  return REGISTRY.get(name);
}

/** Get strategies accessible at or below a given tier */
export function getStrategiesForTier(userTier: StrategyTier): StrategyDefinition[] {
  const userLevel = TIER_ORDER[userTier];
  return ALL_STRATEGIES.filter((s) => TIER_ORDER[s.tier] <= userLevel);
}

/** Check whether a user tier has access to a specific strategy */
export function canAccessStrategy(strategyName: string, userTier: StrategyTier): boolean {
  const strategy = REGISTRY.get(strategyName);
  if (!strategy) return false;
  return TIER_ORDER[userTier] >= TIER_ORDER[strategy.tier];
}

/** Get default strategy for a tier */
export function getDefaultStrategy(userTier: StrategyTier): StrategyDefinition {
  switch (userTier) {
    case 'PLATINUM':
      return REGISTRY.get('FULL_STACK_MTF')!;
    case 'GOLD':
      return REGISTRY.get('TRIPLE_EMA')!;
    case 'SILVER':
      return REGISTRY.get('EMA_CROSS')!;
    default:
      return REGISTRY.get('EMA_CROSS')!;
  }
}

/** Get strategies grouped by category */
export function getStrategiesByCategory() {
  const grouped: Record<string, StrategyDefinition[]> = {};
  for (const strategy of ALL_STRATEGIES) {
    if (!grouped[strategy.category]) grouped[strategy.category] = [];
    grouped[strategy.category].push(strategy);
  }
  return grouped;
}

/** Resolve strategy name from various aliases */
export function resolveStrategyName(nameOrAlias: string): string {
  // Direct match
  if (REGISTRY.has(nameOrAlias)) return nameOrAlias;
  // Case-insensitive match
  const upper = nameOrAlias.toUpperCase().replace(/\s+/g, '_');
  if (REGISTRY.has(upper)) return upper;
  // Legacy aliases
  const ALIASES: Record<string, string> = {
    DEFAULT: 'EMA_CROSS',
    MANUAL: 'EMA_CROSS',
    TREND: 'MACD_TREND',
    REVERSAL: 'RSI_DIVERGENCE',
    BREAKOUT: 'BB_BREAKOUT',
    SCALP: 'RAPID_RSI_STOCH',
    SMC: 'SMC_ICT',
    ICT: 'SMC_ICT',
    WYCKOFF: 'WYCKOFF_CYCLE',
    MTF: 'FULL_STACK_MTF',
    COMPOSITE: 'MARKET_STRUCTURE',
  };
  return ALIASES[nameOrAlias] ?? ALIASES[upper] ?? 'EMA_CROSS';
}

export type { StrategyDefinition, StrategyTier };
