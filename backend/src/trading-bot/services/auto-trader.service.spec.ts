import { Test, TestingModule } from '@nestjs/testing';
import { AutoTraderService } from './auto-trader.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TradingService } from '../../trading/trading.service';
import { MarketDataService } from '../../market-data/market-data.service';
import { SignalResult } from '../interfaces/signal.interface';

const mockSignal = (overrides?: Partial<SignalResult>): SignalResult => ({
  asset: 'BTCUSD',
  assetClass: 'CRYPTO',
  action: 'BUY',
  confidence: 0.8,
  strategy: 'TEST',
  reasoning: 'Test signal reasoning',
  technicalData: {
    asset: 'BTCUSD', timeframe: '1h', compositeScore: 0.7,
    indicators: [], supportLevels: [44000], resistanceLevels: [46000],
    trend: 'UPTREND', patterns: [], atr: 1000, timestamp: new Date(),
  },
  entryPrice: 45000,
  stopLoss: 43500,
  takeProfit: 48000,
  timeframe: '1h',
  expiresAt: new Date(Date.now() + 3 * 3600_000),
  ...overrides,
});

describe('AutoTraderService', () => {
  let service: AutoTraderService;
  let mockPrisma: { botSettings: jest.Mock; tradingSignal: jest.Mock; wallet: jest.Mock; asset: jest.Mock };
  let mockTrading: jest.Mocked<Partial<TradingService>>;
  let mockMarketData: jest.Mocked<Partial<MarketDataService>>;

  beforeEach(async () => {
    mockPrisma = {
      botSettings: {} as jest.Mock,
      tradingSignal: {} as jest.Mock,
      wallet: {} as jest.Mock,
      asset: {} as jest.Mock,
    };

    // Set up default mock implementations
    const botSettingsMock = {
      findUnique: jest.fn().mockResolvedValue({
        autoTradeEnabled: true,
        enabledAssetClasses: ['CRYPTO', 'FOREX', 'STOCK', 'COMMODITY'],
        riskLevel: 'MODERATE',
        maxDailyTrades: 10,
        maxDrawdownPercent: 10,
      }),
    };
    const tradingSignalMock = {
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const walletMock = {
      findUnique: jest.fn().mockResolvedValue({
        balance: 10000, equity: 10500, margin: 1000, freeMargin: 9500,
      }),
    };
    const assetMock = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'asset-btc-id', symbol: 'BTCUSD', minOrderSize: 0.001, spread: 0.0001,
      }),
    };

    mockTrading = {
      placeOrder: jest.fn().mockResolvedValue({
        order: { id: 'order-123' },
        position: { id: 'pos-123' },
      }),
    };

    mockMarketData = {
      getPrice: jest.fn().mockReturnValue({ price: 45000, bid: 44995, ask: 45005 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoTraderService,
        {
          provide: PrismaService, useValue: {
            botSettings: botSettingsMock,
            tradingSignal: tradingSignalMock,
            wallet: walletMock,
            asset: assetMock,
          },
        },
        { provide: TradingService, useValue: mockTrading },
        { provide: MarketDataService, useValue: mockMarketData },
      ],
    }).compile();

    service = module.get<AutoTraderService>(AutoTraderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldAutoExecute', () => {
    it('allows execution when all guards pass', async () => {
      const result = await service.shouldAutoExecute('user1', mockSignal());
      expect(result.allowed).toBe(true);
    });

    it('blocks when auto-trade disabled', async () => {
      (service as unknown as { prisma: { botSettings: { findUnique: jest.Mock } } })
        .prisma.botSettings.findUnique = jest.fn().mockResolvedValue({ autoTradeEnabled: false });
      const result = await service.shouldAutoExecute('user1', mockSignal());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('blocks when settings not found', async () => {
      (service as unknown as { prisma: { botSettings: { findUnique: jest.Mock } } })
        .prisma.botSettings.findUnique = jest.fn().mockResolvedValue(null);
      const result = await service.shouldAutoExecute('user1', mockSignal());
      expect(result.allowed).toBe(false);
    });

    it('blocks HOLD signals', async () => {
      const result = await service.shouldAutoExecute('user1', mockSignal({ action: 'HOLD' }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('advisory');
    });

    it('blocks low confidence signals', async () => {
      const result = await service.shouldAutoExecute('user1', mockSignal({ confidence: 0.3 }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Confidence');
    });

    it('blocks when asset class not enabled', async () => {
      (service as unknown as { prisma: { botSettings: { findUnique: jest.Mock } } })
        .prisma.botSettings.findUnique = jest.fn().mockResolvedValue({
        autoTradeEnabled: true,
        enabledAssetClasses: ['FOREX'], // CRYPTO not enabled
        riskLevel: 'MODERATE',
        maxDailyTrades: 10,
        maxDrawdownPercent: 10,
      });
      const result = await service.shouldAutoExecute('user1', mockSignal({ assetClass: 'CRYPTO' }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('CRYPTO');
    });

    it('blocks when daily trade limit reached', async () => {
      (service as unknown as { prisma: { tradingSignal: { count: jest.Mock } } })
        .prisma.tradingSignal.count = jest.fn().mockResolvedValue(10); // at limit
      const result = await service.shouldAutoExecute('user1', mockSignal());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('enforces rate limiting between trades', async () => {
      // Simulate recent trade
      (service as unknown as { lastTradeTimes: Map<string, number> })
        .lastTradeTimes.set('user1', Date.now() - 30_000); // 30s ago, min is 60s
      const result = await service.shouldAutoExecute('user1', mockSignal());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limited');
    });
  });

  describe('executeSignal', () => {
    it('places a market order and returns success', async () => {
      const execution = await service.executeSignal('user1', 'sig-123', mockSignal());
      expect(execution.success).toBe(true);
      expect(execution.orderId).toBe('order-123');
      expect(execution.positionId).toBe('pos-123');
      expect(mockTrading.placeOrder).toHaveBeenCalledWith('user1', expect.objectContaining({
        type: 'MARKET',
        side: 'BUY',
      }));
    });

    it('maps SELL signal to SELL order side', async () => {
      await service.executeSignal('user1', 'sig-456', mockSignal({ action: 'SELL' }));
      expect(mockTrading.placeOrder).toHaveBeenCalledWith('user1', expect.objectContaining({ side: 'SELL' }));
    });

    it('includes stopLoss and takeProfit in order', async () => {
      await service.executeSignal('user1', 'sig-789', mockSignal());
      expect(mockTrading.placeOrder).toHaveBeenCalledWith('user1', expect.objectContaining({
        stopLoss: 43500,
        takeProfit: 48000,
      }));
    });

    it('returns failure when asset not found', async () => {
      (service as unknown as { prisma: { asset: { findFirst: jest.Mock } } })
        .prisma.asset.findFirst = jest.fn().mockResolvedValue(null);
      const execution = await service.executeSignal('user1', 'sig-999', mockSignal());
      expect(execution.success).toBe(false);
      expect(execution.reason).toContain('Asset not found');
    });

    it('returns failure when trading service throws', async () => {
      (mockTrading.placeOrder as jest.Mock).mockRejectedValue(new Error('Insufficient margin'));
      const execution = await service.executeSignal('user1', 'sig-999', mockSignal());
      expect(execution.success).toBe(false);
      expect(execution.reason).toContain('Insufficient margin');
    });

    it('marks signal as executed on success', async () => {
      await service.executeSignal('user1', 'sig-123', mockSignal());
      expect((service as unknown as { prisma: { tradingSignal: { update: jest.Mock } } })
        .prisma.tradingSignal.update
      ).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED', autoExecuted: true }) })
      );
    });

    it('updates rate limit tracker on success', async () => {
      const before = Date.now();
      await service.executeSignal('user1', 'sig-123', mockSignal());
      const lastTime = (service as unknown as { lastTradeTimes: Map<string, number> })
        .lastTradeTimes.get('user1');
      expect(lastTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('manualExecute', () => {
    it('returns failure when signal not found', async () => {
      (service as unknown as { prisma: { tradingSignal: { findFirst: jest.Mock } } })
        .prisma.tradingSignal.findFirst = jest.fn().mockResolvedValue(null);
      const result = await service.manualExecute('user1', 'nonexistent');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('executes order when signal exists and is pending', async () => {
      (service as unknown as { prisma: { tradingSignal: { findFirst: jest.Mock } } })
        .prisma.tradingSignal.findFirst = jest.fn().mockResolvedValue({
        id: 'sig-123', userId: 'user1', status: 'PENDING',
        asset: 'BTCUSD', assetClass: 'CRYPTO', action: 'BUY',
        confidence: 0.8, strategy: 'TEST', reasoning: 'test',
        technicalData: {}, fundamentalData: null,
        entryPrice: 45000, stopLoss: 43500, takeProfit: 48000,
        timeframe: '1h', expiresAt: new Date(Date.now() + 3600_000),
      });
      const result = await service.manualExecute('user1', 'sig-123');
      expect(result.success).toBe(true);
    });
  });
});
