import { Test, TestingModule } from '@nestjs/testing';
import { SignalEngineService } from './signal-engine.service';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { FundamentalAnalysisService } from './fundamental-analysis.service';
import { ExternalDataService } from './external-data.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TechnicalAnalysisResult, FundamentalAnalysisResult } from '../interfaces/signal.interface';

const makeTAResult = (score: number): TechnicalAnalysisResult => ({
  asset: 'BTCUSD',
  timeframe: '1h',
  compositeScore: score,
  indicators: [{ name: 'RSI(14)', value: score > 0 ? 25 : 75, signal: score > 0 ? 'BULLISH' : 'BEARISH', score }],
  supportLevels: [44000, 43000],
  resistanceLevels: [46000, 47000],
  trend: score > 0 ? 'UPTREND' : score < 0 ? 'DOWNTREND' : 'SIDEWAYS',
  patterns: score > 0 ? ['Higher Highs'] : [],
  atr: 1000,
  timestamp: new Date(),
});

const makeFA = (score: number): FundamentalAnalysisResult => ({
  asset: 'BTCUSD',
  compositeScore: score,
  sentimentScore: score,
  newsItems: [],
  catalysts: score > 0 ? ['Strong adoption news'] : [],
  timestamp: new Date(),
});

describe('SignalEngineService', () => {
  let service: SignalEngineService;
  let mockPrisma: jest.Mocked<Partial<PrismaService>>;
  let mockTA: jest.Mocked<Partial<TechnicalAnalysisService>>;
  let mockFA: jest.Mocked<Partial<FundamentalAnalysisService>>;
  let mockExternal: jest.Mocked<Partial<ExternalDataService>>;

  beforeEach(async () => {
    mockPrisma = {
      tradingSignal: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      } as unknown as typeof mockPrisma.tradingSignal,
    };
    mockTA = { analyze: jest.fn() };
    mockFA = { analyze: jest.fn() };
    mockExternal = { getCurrentPrice: jest.fn().mockResolvedValue(45000) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TechnicalAnalysisService, useValue: mockTA },
        { provide: FundamentalAnalysisService, useValue: mockFA },
        { provide: ExternalDataService, useValue: mockExternal },
      ],
    }).compile();
    service = module.get<SignalEngineService>(SignalEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSignal', () => {
    it('generates BUY signal when TA+FA both strongly bullish', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.7));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.6));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.action).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('generates SELL signal when TA+FA both strongly bearish', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(-0.7));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(-0.6));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.action).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('generates HOLD signal when score near zero', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.1));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.05));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.action).toBe('HOLD');
    });

    it('includes entry price when current price available', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.8));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.7));
      (mockExternal.getCurrentPrice as jest.Mock).mockResolvedValue(45000);
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.entryPrice).toBe(45000);
      expect(result.stopLoss).toBeLessThan(45000); // below entry for BUY
      expect(result.takeProfit).toBeGreaterThan(45000); // above entry for BUY
    });

    it('ensures takeProfit > entry > stopLoss for BUY signals', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.8));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.8));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      if (result.entryPrice && result.stopLoss && result.takeProfit) {
        expect(result.takeProfit).toBeGreaterThan(result.entryPrice!);
        expect(result.stopLoss).toBeLessThan(result.entryPrice!);
      }
    });

    it('ensures takeProfit < entry < stopLoss for SELL signals', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(-0.8));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(-0.8));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      if (result.action === 'SELL' && result.entryPrice && result.stopLoss && result.takeProfit) {
        expect(result.stopLoss).toBeGreaterThan(result.entryPrice!);
        expect(result.takeProfit).toBeLessThan(result.entryPrice!);
      }
    });

    it('includes expiry in the future', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.5));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.4));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('includes non-empty reasoning string', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.6));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.3));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(20);
    });

    it('persists signal to database', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.6));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.3));
      await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockPrisma.tradingSignal as any).create).toHaveBeenCalledTimes(1);
    });

    it('continues gracefully when price fetch fails', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue(makeTAResult(0.5));
      (mockFA.analyze as jest.Mock).mockResolvedValue(makeFA(0.3));
      (mockExternal.getCurrentPrice as jest.Mock).mockRejectedValue(new Error('price unavailable'));
      const result = await service.generateSignal('user1', 'BTCUSD', 'CRYPTO', '1h');
      expect(result.action).toBeDefined();
      expect(result.entryPrice).toBeUndefined();
    });
  });

  describe('expireOldSignals', () => {
    it('calls updateMany with PENDING status and past expiry', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.tradingSignal as any).updateMany = jest.fn().mockResolvedValue({ count: 3 });
      const count = await service.expireOldSignals();
      expect(count).toBe(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockPrisma.tradingSignal as any).updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) })
      );
    });
  });
});
