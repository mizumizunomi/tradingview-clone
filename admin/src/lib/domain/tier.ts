/**
 * Admin-side MIRROR of the backend canonical tier logic
 * (backend/src/domain/tier.ts + backend/src/plan/constants/tier-config.ts).
 *
 * The backend and admin are separate apps with separate builds, so this logic is duplicated
 * here rather than imported. To prevent silent drift (which previously caused the same deposit
 * to grant a different tier depending on who processed it), the entry thresholds below are
 * guarded by scripts/check-domain-parity.ts, which fails if these values ever diverge from the
 * backend's TIER_CONFIG.depositRequired.
 */

export type TierName = 'NONE' | 'DEFAULT' | 'SILVER' | 'GOLD' | 'PLATINUM';

/** Deposit amount that defines each tier's entry point — mirror of TIER_CONFIG.depositRequired. */
export const TIER_DEPOSIT_REQUIRED: Record<TierName, number> = {
  NONE: 0,
  DEFAULT: 250,
  SILVER: 2500,
  GOLD: 10000,
  PLATINUM: 50000,
};

// Ordered high → low so the first threshold met wins.
const TIER_ORDER: TierName[] = ['PLATINUM', 'GOLD', 'SILVER', 'DEFAULT'];

/** Resolve a tier from the user's lifetime total deposited, using canonical thresholds. */
export function determineTier(totalDeposited: number): TierName {
  for (const tier of TIER_ORDER) {
    if (totalDeposited >= TIER_DEPOSIT_REQUIRED[tier]) return tier;
  }
  return 'NONE';
}

/** Map a TierName to the lowercase User.plan string persisted on the user row. */
export function tierToPlanString(tier: TierName): string {
  return tier.toLowerCase();
}
