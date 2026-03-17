import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SignalEngineService } from './services/signal-engine.service';
import { StrategyService } from './services/strategy.service';
import { ResearchService } from './services/research.service';
import { ExternalDataService } from './services/external-data.service';
import { TechnicalAnalysisService } from './services/technical-analysis.service';
import { FundamentalAnalysisService } from './services/fundamental-analysis.service';
import { AutoTraderService } from './services/auto-trader.service';
import { SignalSchedulerService } from './services/signal-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateSignalDto } from './dto/generate-signal.dto';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/create-strategy.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AssetClass } from './interfaces/signal.interface';

// Simple in-memory cache entry
interface CacheEntry<T> { data: T; expiresAt: number; }

@UseGuards(JwtAuthGuard)
@Controller('bot')
export class TradingBotController {
  private readonly responseCache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  constructor(
    private readonly signalEngine: SignalEngineService,
    private readonly strategyService: StrategyService,
    private readonly researchService: ResearchService,
    private readonly externalData: ExternalDataService,
    private readonly technicalAnalysis: TechnicalAnalysisService,
    private readonly fundamentalAnalysis: FundamentalAnalysisService,
    private readonly autoTrader: AutoTraderService,
    private readonly scheduler: SignalSchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Signals ──────────────────────────────────────────────────────────────────

  @Get('signals')
  async getSignals(
    @Request() req: { user: { userId: string } },
    @Query('asset') asset?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.signalEngine.getSignals(req.user.userId, {
      asset, action, status, limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('signals/generate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async generateSignal(
    @Request() req: { user: { userId: string } },
    @Body() dto: GenerateSignalDto,
  ) {
    return this.signalEngine.generateSignal(
      req.user.userId,
      dto.asset,
      dto.assetClass,
      dto.timeframe ?? '1h',
      dto.strategy ?? 'MANUAL',
    );
  }

  @Post('signals/:id/execute')
  @HttpCode(HttpStatus.OK)
  async executeSignal(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.autoTrader.manualExecute(req.user.userId, id);
  }

  @Post('signals/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSignal(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    await this.autoTrader.cancelSignal(req.user.userId, id);
    return { cancelled: true };
  }

  // ── Analysis ─────────────────────────────────────────────────────────────────

  @Get('analysis/:asset')
  async getAnalysis(
    @Param('asset') asset: string,
    @Query('assetClass') assetClass: string,
    @Query('timeframe') timeframe = '1h',
  ) {
    const cls = (assetClass?.toUpperCase() ?? 'CRYPTO') as AssetClass;
    const [ta, fa] = await Promise.all([
      this.technicalAnalysis.analyze(asset, cls, timeframe),
      this.fundamentalAnalysis.analyze(asset, cls),
    ]);
    return { technical: ta, fundamental: fa };
  }

  @Post('research/:asset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async runResearch(
    @Param('asset') asset: string,
    @Query('assetClass') assetClass: string,
  ) {
    const cls = (assetClass?.toUpperCase() ?? 'CRYPTO') as AssetClass;
    return this.researchService.generateReport(asset, cls);
  }

  // ── Strategies ────────────────────────────────────────────────────────────────

  @Get('strategies')
  async getStrategies(@Request() req: { user: { userId: string } }) {
    return this.strategyService.getStrategies(req.user.userId);
  }

  @Post('strategies')
  async createStrategy(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateStrategyDto,
  ) {
    return this.strategyService.createStrategy(req.user.userId, dto);
  }

  @Put('strategies/:id')
  async updateStrategy(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
  ) {
    return this.strategyService.updateStrategy(req.user.userId, id, dto);
  }

  @Delete('strategies/:id')
  async deleteStrategy(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.strategyService.deleteStrategy(req.user.userId, id);
  }

  @Post('strategies/:id/backtest')
  @HttpCode(HttpStatus.OK)
  async backtestStrategy(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe = '1h',
    @Query('days') days?: string,
  ) {
    const result = await this.strategyService.backtest(
      req.user.userId, id, symbol, timeframe, days ? parseInt(days) : 90,
    );
    await this.prisma.botStrategy.update({
      where: { id },
      data: { backtestResults: result as object },
    });
    return result;
  }

  // ── Settings ──────────────────────────────────────────────────────────────────

  @Get('settings')
  async getSettings(@Request() req: { user: { userId: string } }) {
    return this.upsertDefaultSettings(req.user.userId);
  }

  @Put('settings')
  async updateSettings(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.prisma.botSettings.upsert({
      where: { userId: req.user.userId },
      update: {
        ...(dto.autoTradeEnabled !== undefined && { autoTradeEnabled: dto.autoTradeEnabled }),
        ...(dto.riskLevel && { riskLevel: dto.riskLevel }),
        ...(dto.maxDailyTrades && { maxDailyTrades: dto.maxDailyTrades }),
        ...(dto.maxDrawdownPercent && { maxDrawdownPercent: dto.maxDrawdownPercent }),
        ...(dto.enabledAssetClasses && { enabledAssetClasses: dto.enabledAssetClasses }),
        ...(dto.notifyOnSignal !== undefined && { notifyOnSignal: dto.notifyOnSignal }),
      },
      create: {
        userId: req.user.userId,
        autoTradeEnabled: dto.autoTradeEnabled ?? false,
        riskLevel: dto.riskLevel ?? 'MODERATE',
        maxDailyTrades: dto.maxDailyTrades ?? 10,
        maxDrawdownPercent: dto.maxDrawdownPercent ?? 5.0,
        enabledAssetClasses: dto.enabledAssetClasses ?? ['CRYPTO'],
        notifyOnSignal: dto.notifyOnSignal ?? true,
      },
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  @Get('dashboard')
  async getDashboard(@Request() req: { user: { userId: string } }) {
    const userId = req.user.userId;
    const cacheKey = `dashboard:${userId}`;
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    const [stats, settings, providerStatuses, schedulerStatus] = await Promise.all([
      this.signalEngine.getDashboardStats(userId),
      this.upsertDefaultSettings(userId),
      Promise.resolve(this.externalData.getProviderStatuses()),
      Promise.resolve(this.scheduler.getStatus()),
    ]);

    const recentSignals = await this.prisma.tradingSignal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const result = { ...stats, recentSignals, settings, providerStatuses, schedulerStatus };
    this.responseCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  // ── Provider / Bot Status ─────────────────────────────────────────────────────

  @Get('status')
  async getStatus() {
    const cacheKey = 'status:global';
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    const result = {
      providers: this.externalData.getProviderStatuses(),
      scheduler: this.scheduler.getStatus(),
      cache: this.externalData.getCacheStats(),
    };
    this.responseCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async upsertDefaultSettings(userId: string) {
    return this.prisma.botSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        autoTradeEnabled: false,
        riskLevel: 'MODERATE',
        maxDailyTrades: 10,
        maxDrawdownPercent: 5.0,
        enabledAssetClasses: ['CRYPTO'],
        notifyOnSignal: true,
      },
    });
  }
}
