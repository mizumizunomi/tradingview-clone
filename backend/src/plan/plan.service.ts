import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TierName, getTierConfig, planStringToTier, TIER_CONFIG } from './constants/tier-config';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async getUserTier(userId: string): Promise<TierName> {
    // First try UserSubscription
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      select: { tier: true },
    });
    if (subscription && subscription.tier !== 'NONE') {
      return subscription.tier as TierName;
    }

    // Fall back to User.plan string
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return planStringToTier(user?.plan ?? undefined);
  }

  getTierConfig(tier: TierName) {
    return getTierConfig(tier);
  }

  async canTrade(userId: string): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    return getTierConfig(tier).canTrade;
  }

  async canAccessAsset(userId: string, assetSymbol: string, assetCategory: string): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);

    // Check category access
    const cat = assetCategory.toUpperCase();
    const allowedCategories = config.allowedAssetCategories as readonly string[];
    if (!allowedCategories.includes(cat)) {
      return false;
    }

    // For CRYPTO: check specific symbol access
    if (cat === 'CRYPTO') {
      const cryptoSymbols = config.allowedCryptoSymbols;
      if (cryptoSymbols === 'ALL') return true;
      if (Array.isArray(cryptoSymbols)) {
        // DEFAULT: BTCUSD is view-only, not tradeable
        if (tier === 'DEFAULT') return false; // can view but not trade crypto
        return cryptoSymbols.includes(assetSymbol);
      }
      return false;
    }

    // For FOREX: check symbol access
    if (cat === 'FOREX') {
      const forexSymbols = config.allowedForexSymbols;
      if (forexSymbols === 'ALL' || forexSymbols === 'ALL_MAJORS') return true;
      if (Array.isArray(forexSymbols)) {
        return forexSymbols.includes(assetSymbol);
      }
      return false;
    }

    // For STOCKS: check symbol access
    if (cat === 'STOCKS') {
      const stockSymbols = config.allowedStockSymbols;
      if (stockSymbols === 'ALL') return true;
      if (Array.isArray(stockSymbols)) {
        return stockSymbols.includes(assetSymbol);
      }
      return false;
    }

    // Other categories (COMMODITIES, INDICES, FUTURES) — allow if in allowedCategories
    return true;
  }

  async canOpenPosition(userId: string): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);

    const openCount = await this.prisma.position.count({
      where: { userId, isOpen: true },
    });

    return openCount < config.maxPositions;
  }

  async getMaxLeverage(userId: string): Promise<number> {
    const tier = await this.getUserTier(userId);
    return getTierConfig(tier).maxLeverage;
  }

  async getCommissionRate(userId: string): Promise<number> {
    const tier = await this.getUserTier(userId);
    return getTierConfig(tier).commission;
  }

  async canUseBotAccess(userId: string, level: 'signals' | 'full' | 'premium'): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);
    const accessOrder = ['none', 'signals', 'full', 'premium'];
    const userAccessIdx = accessOrder.indexOf(config.botAccess);
    const requiredIdx = accessOrder.indexOf(level);
    return userAccessIdx >= requiredIdx;
  }

  async getAvailableIndicators(userId: string): Promise<string[] | 'ALL'> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);
    if (config.indicators === 'ALL') return 'ALL';
    return [...(config.indicators as readonly string[])];
  }

  async getAvailableOrderTypes(userId: string): Promise<string[]> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);
    return [...config.orderTypes];
  }

  async getUserPlanInfo(userId: string): Promise<{ tier: TierName; config: typeof TIER_CONFIG[TierName]; subscription: unknown }> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);

    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    return { tier, config, subscription };
  }
}
