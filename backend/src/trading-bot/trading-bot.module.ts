import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TradingModule } from '../trading/trading.module';
import { MarketDataModule } from '../market-data/market-data.module';

// Controller & Gateway
import { TradingBotController } from './trading-bot.controller';
import { TradingBotGateway } from './trading-bot.gateway';

// Services
import { SignalEngineService } from './services/signal-engine.service';
import { TechnicalAnalysisService } from './services/technical-analysis.service';
import { FundamentalAnalysisService } from './services/fundamental-analysis.service';
import { StrategyService } from './services/strategy.service';
import { AutoTraderService } from './services/auto-trader.service';
import { ResearchService } from './services/research.service';
import { ExternalDataService } from './services/external-data.service';
import { SignalSchedulerService } from './services/signal-scheduler.service';
import { LevelDetectionService } from './services/level-detection.service';
import { ChartDataService } from './services/chart-data.service';
import { AnalysisEngineService } from './services/analysis-engine.service';

// Data providers
import { BinanceProvider } from './providers/binance.provider';
import { BybitProvider } from './providers/bybit.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { TwelveDataProvider } from './providers/twelvedata.provider';
import { NewsAggregatorProvider } from './providers/news-aggregator.provider';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    PrismaModule,
    TradingModule,
    MarketDataModule,
  ],
  controllers: [TradingBotController],
  providers: [
    TradingBotGateway,

    // Data providers
    BinanceProvider,
    BybitProvider,
    CoinGeckoProvider,
    TwelveDataProvider,
    NewsAggregatorProvider,

    // Unified data layer
    ExternalDataService,

    // Analysis
    TechnicalAnalysisService,
    FundamentalAnalysisService,

    // Core
    SignalEngineService,
    StrategyService,
    AutoTraderService,
    ResearchService,

    // Scheduler (runs periodic signal cycle)
    SignalSchedulerService,

    // Chart-integrated analysis (v2)
    LevelDetectionService,
    ChartDataService,
    AnalysisEngineService,
  ],
  exports: [SignalEngineService, ExternalDataService, TradingBotGateway, AnalysisEngineService],
})
export class TradingBotModule {}
