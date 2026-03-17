import { SetMetadata } from '@nestjs/common';
import { TierName } from './constants/tier-config';
export const REQUIRED_TIER_KEY = 'requiredTier';
export const RequirePlan = (tier: TierName) => SetMetadata(REQUIRED_TIER_KEY, tier);
