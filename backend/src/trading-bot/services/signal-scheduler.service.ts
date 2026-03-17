import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalEngineService } from './signal-engine.service';
import { AutoTraderService } from './auto-trader.service';
import { TradingBotGateway } from '../trading-bot.gateway';
import { AssetClass, SignalResult } from '../interfaces/signal.interface';

interface WatchedAsset {
  symbol: string;
  assetClass: AssetClass;
  userIds: string[];
}

/**
 * Runs periodic signal generation for all active bot users.
 * Pushes generated signals via WebSocket and triggers auto-execution if enabled.
 */
@Injectable()
export class SignalSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SignalSchedulerService.name);
  private signalTimer: NodeJS.Timeout | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  private readonly SIGNAL_INTERVAL_MS =
    parseInt(process.env.BOT_SIGNAL_INTERVAL_MS ?? '60000');
  private readonly EXPIRY_CHECK_INTERVAL_MS = 120_000; // every 2 minutes

  // Default assets to watch when user has no custom watchlist
  private readonly DEFAULT_WATCH_ASSETS: Array<{ symbol: string; assetClass: AssetClass }> = [
    { symbol: 'BTCUSD', assetClass: 'CRYPTO' },
    { symbol: 'ETHUSD', assetClass: 'CRYPTO' },
    { symbol: 'SOLUSD', assetClass: 'CRYPTO' },
    { symbol: 'EURUSD', assetClass: 'FOREX' },
    { symbol: 'XAUUSD', assetClass: 'COMMODITY' },
    { symbol: 'AAPL', assetClass: 'STOCK' },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalEngine: SignalEngineService,
    private readonly autoTrader: AutoTraderService,
    private readonly gateway: TradingBotGateway,
  ) {}

  onModuleInit() {
    // Stagger start by 10s to let other services initialise
    setTimeout(() => this.start(), 10_000);
  }

  onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log(`Signal scheduler started (interval: ${this.SIGNAL_INTERVAL_MS / 1000}s)`);

    this.signalTimer = setInterval(() => this.runSignalCycle(), this.SIGNAL_INTERVAL_MS);
    this.expiryTimer = setInterval(() => this.runExpiryCleanup(), this.EXPIRY_CHECK_INTERVAL_MS);

    // Run once immediately after the initial delay
    this.runSignalCycle().catch((err) =>
      this.logger.warn(`Initial signal cycle failed: ${(err as Error).message}`)
    );
  }

  stop() {
    if (this.signalTimer) { clearInterval(this.signalTimer); this.signalTimer = null; }
    if (this.expiryTimer) { clearInterval(this.expiryTimer); this.expiryTimer = null; }
    this.isRunning = false;
    this.logger.log('Signal scheduler stopped');
  }

  // ── Signal cycle ──────────────────────────────────────────────────────────────

  private async runSignalCycle(): Promise<void> {
    try {
      // Find all users who have bot settings (i.e. have used the bot)
      const botSettings = await this.prisma.botSettings.findMany({
        where: { notifyOnSignal: true },
        select: { userId: true, enabledAssetClasses: true },
      });

      if (!botSettings.length) return;

      // Build watched asset list per user
      const watchedAssets = await this.buildWatchedAssets(botSettings);

      const maxConcurrent = parseInt(process.env.BOT_MAX_CONCURRENT_ANALYSES ?? '5');

      // Process in chunks
      for (let i = 0; i < watchedAssets.length; i += maxConcurrent) {
        const chunk = watchedAssets.slice(i, i + maxConcurrent);
        await Promise.allSettled(
          chunk.map((asset) => this.processAsset(asset))
        );
      }
    } catch (err) {
      this.logger.error(`Signal cycle error: ${(err as Error).message}`);
    }
  }

  private async processAsset(asset: WatchedAsset): Promise<void> {
    for (const userId of asset.userIds) {
      try {
        const signal = await this.signalEngine.generateSignal(
          userId, asset.symbol, asset.assetClass, '1h', 'SCHEDULER',
        );

        // Push to user via WebSocket
        this.gateway.emitSignalToUser(userId, 'bot:signal:new', signal);
        this.gateway.broadcastSignalToAssetSubscribers(asset.symbol, 'bot:analysis:update', signal);

        // Auto-execute if enabled
        await this.maybeAutoExecute(userId, signal);
      } catch (err) {
        this.logger.debug(`Signal failed for ${asset.symbol}/${userId}: ${(err as Error).message}`);
      }
    }
  }

  private async maybeAutoExecute(userId: string, signal: SignalResult): Promise<void> {
    // Find the just-persisted signal's DB id
    const dbSignal = await this.prisma.tradingSignal.findFirst({
      where: { userId, asset: signal.asset, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!dbSignal) return;

    const guard = await this.autoTrader.shouldAutoExecute(userId, signal);
    if (!guard.allowed) {
      this.logger.debug(`Auto-trade blocked for ${signal.asset}: ${guard.reason}`);
      return;
    }

    const execution = await this.autoTrader.executeSignal(userId, dbSignal.id, signal);
    if (execution.success) {
      this.gateway.emitSignalToUser(userId, 'bot:signal:executed', {
        signalId: dbSignal.id,
        orderId: execution.orderId,
        positionId: execution.positionId,
        asset: signal.asset,
        action: signal.action,
      });
      this.logger.log(`Auto-executed ${signal.action} ${signal.asset} for user ${userId}`);
    } else {
      this.gateway.emitSignalToUser(userId, 'bot:status', {
        active: true,
        message: `Auto-trade skipped: ${execution.reason}`,
      });
    }
  }

  private async buildWatchedAssets(
    settings: Array<{ userId: string; enabledAssetClasses: AssetClass[] }>,
  ): Promise<WatchedAsset[]> {
    const assetMap = new Map<string, WatchedAsset>();

    for (const setting of settings) {
      // Filter default assets by enabled asset classes
      const enabled = this.DEFAULT_WATCH_ASSETS.filter(
        (a) => setting.enabledAssetClasses.includes(a.assetClass)
      );

      // Also include assets from user's watchlist
      const watchlist = await this.prisma.watchlistItem.findMany({
        where: { userId: setting.userId },
        include: { asset: true },
        take: 10,
      });

      const userAssets = [
        ...enabled,
        ...watchlist.map((w) => ({
          symbol: w.asset.symbol,
          assetClass: this.mapCategoryToClass(w.asset.category),
        })),
      ];

      for (const asset of userAssets) {
        const key = asset.symbol;
        if (!assetMap.has(key)) {
          assetMap.set(key, { symbol: asset.symbol, assetClass: asset.assetClass, userIds: [] });
        }
        const entry = assetMap.get(key)!;
        if (!entry.userIds.includes(setting.userId)) {
          entry.userIds.push(setting.userId);
        }
      }
    }

    return Array.from(assetMap.values());
  }

  private mapCategoryToClass(category: string): AssetClass {
    const map: Record<string, AssetClass> = {
      CRYPTO: 'CRYPTO', FOREX: 'FOREX',
      STOCKS: 'STOCK', COMMODITIES: 'COMMODITY',
      INDICES: 'STOCK', FUTURES: 'COMMODITY',
    };
    return map[category] ?? 'CRYPTO';
  }

  // ── Expiry cleanup ────────────────────────────────────────────────────────────

  private async runExpiryCleanup(): Promise<void> {
    try {
      const count = await this.signalEngine.expireOldSignals();
      if (count > 0) {
        this.logger.debug(`Expired ${count} old signals`);
      }
    } catch (err) {
      this.logger.warn(`Expiry cleanup failed: ${(err as Error).message}`);
    }
  }

  getStatus(): { running: boolean; intervalMs: number } {
    return { running: this.isRunning, intervalMs: this.SIGNAL_INTERVAL_MS };
  }
}
