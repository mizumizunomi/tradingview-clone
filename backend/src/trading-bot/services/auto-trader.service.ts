import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TradingService } from '../../trading/trading.service';
import { MarketDataService } from '../../market-data/market-data.service';
import { SignalResult } from '../interfaces/signal.interface';
import { OrderSideDto, OrderTypeDto } from '../../trading/dto/place-order.dto';

export interface AutoTradeGuardResult {
  allowed: boolean;
  reason?: string;
}

export interface AutoTradeExecution {
  success: boolean;
  signalId: string;
  orderId?: string;
  positionId?: string;
  reason?: string;
}

/**
 * Validates signals against risk rules, computes position size,
 * and delegates order placement to the existing TradingService.
 */
@Injectable()
export class AutoTraderService {
  private readonly logger = new Logger(AutoTraderService.name);

  /** Minimum confidence required for auto-execution */
  private readonly MIN_CONFIDENCE = 0.55;
  /** Minimum ms between auto-trades per user (rate limiting) */
  private readonly MIN_INTERVAL_MS = 60_000;
  /** Default position size as fraction of free margin */
  private readonly DEFAULT_POSITION_FRACTION = 0.05; // 5% of free margin per trade

  // In-memory last-trade-time tracking (per user)
  private readonly lastTradeTimes = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tradingService: TradingService,
    private readonly marketData: MarketDataService,
  ) {}

  // ── Guard checks ─────────────────────────────────────────────────────────────

  async shouldAutoExecute(userId: string, signal: SignalResult): Promise<AutoTradeGuardResult> {
    // 1. Settings
    const settings = await this.prisma.botSettings.findUnique({ where: { userId } });
    if (!settings?.autoTradeEnabled) {
      return { allowed: false, reason: 'Auto-trading is disabled' };
    }

    // 2. Asset class enabled
    if (!settings.enabledAssetClasses.includes(signal.assetClass)) {
      return { allowed: false, reason: `${signal.assetClass} not enabled in bot settings` };
    }

    // 3. Confidence threshold
    if (signal.confidence < this.MIN_CONFIDENCE) {
      return { allowed: false, reason: `Confidence ${(signal.confidence * 100).toFixed(0)}% below minimum ${this.MIN_CONFIDENCE * 100}%` };
    }

    // 4. HOLD signals are never executed
    if (signal.action === 'HOLD') {
      return { allowed: false, reason: 'HOLD signals are advisory only' };
    }

    // 5. Rate limit
    const lastTime = this.lastTradeTimes.get(userId) ?? 0;
    const elapsed = Date.now() - lastTime;
    if (elapsed < this.MIN_INTERVAL_MS) {
      const waitSec = Math.ceil((this.MIN_INTERVAL_MS - elapsed) / 1000);
      return { allowed: false, reason: `Rate limited — wait ${waitSec}s before next auto-trade` };
    }

    // 6. Daily trade count
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.tradingSignal.count({
      where: { userId, autoExecuted: true, createdAt: { gte: todayStart } },
    });
    if (todayCount >= settings.maxDailyTrades) {
      return { allowed: false, reason: `Daily limit of ${settings.maxDailyTrades} auto-trades reached` };
    }

    // 7. Drawdown check
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (wallet) {
      // If margin level is dangerously low, pause auto-trading
      const wMargin = Number(wallet.margin);
      const wEquity = Number(wallet.equity);
      const wBalance = Number(wallet.balance);
      const marginLevel = wMargin > 0 ? (wEquity / wMargin) * 100 : Infinity;
      if (marginLevel < 150) {
        return { allowed: false, reason: `Margin level ${marginLevel.toFixed(0)}% too low — auto-trading paused (min 150%)` };
      }
      // Drawdown from balance
      const drawdownPct = wEquity < wBalance
        ? ((wBalance - wEquity) / wBalance) * 100 : 0;
      if (drawdownPct >= Number(settings.maxDrawdownPercent)) {
        return {
          allowed: false,
          reason: `Daily drawdown ${drawdownPct.toFixed(1)}% reached limit of ${settings.maxDrawdownPercent}% — auto-trading paused`,
        };
      }
    }

    return { allowed: true };
  }

  // ── Order Execution ───────────────────────────────────────────────────────────

  /**
   * Execute a signal as a market order. Finds the asset record, computes
   * position size from risk params, and delegates to TradingService.placeOrder.
   */
  async executeSignal(userId: string, signalId: string, signal: SignalResult): Promise<AutoTradeExecution> {
    try {
      // Look up asset record
      const asset = await this.prisma.asset.findFirst({
        where: {
          OR: [
            { symbol: signal.asset },
            { apiSymbol: signal.asset },
            { symbol: signal.asset.replace('/', '') },
          ],
          isActive: true,
        },
      });

      if (!asset) {
        return { success: false, signalId, reason: `Asset not found: ${signal.asset}` };
      }

      // Get current price for position sizing
      const priceData = this.marketData.getPrice(asset.symbol);
      const currentPrice = priceData?.price ?? signal.entryPrice;
      if (!currentPrice || currentPrice <= 0) {
        return { success: false, signalId, reason: 'Could not determine current price' };
      }

      // Compute position size based on risk params
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) return { success: false, signalId, reason: 'Wallet not found' };

      const settings = await this.prisma.botSettings.findUnique({ where: { userId } });
      const riskFraction = this.getRiskFraction(settings?.riskLevel ?? 'MODERATE');
      const notionalBudget = Number(wallet.freeMargin) * riskFraction;
      const quantity = Math.max(Number(asset.minOrderSize), notionalBudget / currentPrice);

      const orderSide = signal.action === 'BUY' ? 'BUY' : 'SELL';

      this.logger.log(
        `Auto-executing ${orderSide} ${quantity.toFixed(4)} ${asset.symbol} @ ~${currentPrice} (signal ${signalId})`
      );

      const result = await this.tradingService.placeOrder(userId, {
        assetId: asset.id,
        type: OrderTypeDto.MARKET,
        side: orderSide as OrderSideDto,
        quantity,
        leverage: 1,
        stopLoss: signal.stopLoss ? Number(signal.stopLoss) : undefined,
        takeProfit: signal.takeProfit ? Number(signal.takeProfit) : undefined,
      });

      // Mark signal as executed
      this.lastTradeTimes.set(userId, Date.now());
      await this.prisma.tradingSignal.update({
        where: { id: signalId },
        data: { status: 'EXECUTED', autoExecuted: true },
      });

      return {
        success: true,
        signalId,
        orderId: result.order.id,
        positionId: result.position.id,
      };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Auto-trade failed for signal ${signalId}: ${message}`);
      return { success: false, signalId, reason: message };
    }
  }

  /**
   * Manually execute a specific pending signal (user clicks "Execute" button).
   */
  async manualExecute(userId: string, signalId: string): Promise<AutoTradeExecution> {
    const signal = await this.prisma.tradingSignal.findFirst({
      where: { id: signalId, userId, status: 'PENDING' },
    });
    if (!signal) {
      return { success: false, signalId, reason: 'Signal not found or already executed' };
    }

    const signalResult: SignalResult = {
      asset: signal.asset,
      assetClass: signal.assetClass,
      action: signal.action,
      confidence: Number(signal.confidence),
      strategy: signal.strategy,
      reasoning: signal.reasoning,
      technicalData: signal.technicalData as unknown as SignalResult['technicalData'],
      fundamentalData: signal.fundamentalData as unknown as SignalResult['fundamentalData'],
      entryPrice: signal.entryPrice != null ? Number(signal.entryPrice) : undefined,
      stopLoss: signal.stopLoss != null ? Number(signal.stopLoss) : undefined,
      takeProfit: signal.takeProfit != null ? Number(signal.takeProfit) : undefined,
      timeframe: signal.timeframe,
      expiresAt: signal.expiresAt ?? undefined,
    };

    return this.executeSignal(userId, signalId, signalResult);
  }

  async cancelSignal(userId: string, signalId: string): Promise<void> {
    await this.prisma.tradingSignal.updateMany({
      where: { id: signalId, userId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private getRiskFraction(riskLevel: string): number {
    const fractions: Record<string, number> = {
      CONSERVATIVE: 0.02,  // 2% of free margin
      MODERATE: 0.05,      // 5%
      AGGRESSIVE: 0.10,    // 10%
    };
    return fractions[riskLevel] ?? this.DEFAULT_POSITION_FRACTION;
  }
}
