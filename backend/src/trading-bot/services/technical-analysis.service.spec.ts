import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { ExternalDataService } from './external-data.service';
import { OHLCVCandle } from '../interfaces/provider.interface';

// Generate synthetic candle data for testing
function generateCandles(count: number, startPrice = 100, trend: 'up' | 'down' | 'flat' = 'flat'): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = startPrice;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < count; i++) {
    // Strong drift with low noise for reliable trend tests
    const drift = trend === 'up' ? 0.006 : trend === 'down' ? -0.006 : 0;
    const noise = (Math.random() - 0.5) * 0.002; // tiny noise
    price = Math.max(0.01, price * (1 + drift + noise));
    const vol = price * 0.002;
    const open = price;
    const close = trend === 'up' ? price * 1.003 : trend === 'down' ? price * 0.997 : price;
    candles.push({
      time: now - (count - i) * 3600,
      open,
      high: Math.max(open, close) + vol * 0.3,
      low: Math.min(open, close) - vol * 0.3,
      close,
      volume: 1000 + Math.random() * 5000,
    });
  }
  return candles;
}

describe('TechnicalAnalysisService', () => {
  let service: TechnicalAnalysisService;
  let mockExternalData: jest.Mocked<Partial<ExternalDataService>>;

  beforeEach(async () => {
    mockExternalData = {
      getCandles: jest.fn(),
      getRSI: jest.fn().mockResolvedValue(null),
      getMACD: jest.fn().mockResolvedValue(null),
      getBollingerBands: jest.fn().mockResolvedValue(null),
      getEMA: jest.fn().mockResolvedValue(null),
      getATR: jest.fn().mockResolvedValue(null),
      getADX: jest.fn().mockResolvedValue(null),
      getStoch: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalAnalysisService,
        { provide: ExternalDataService, useValue: mockExternalData },
      ],
    }).compile();
    service = module.get<TechnicalAnalysisService>(TechnicalAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyze', () => {
    it('returns empty result when insufficient candles', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(10));
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.compositeScore).toBe(0);
      expect(result.indicators).toHaveLength(0);
      expect(result.trend).toBe('SIDEWAYS');
    });

    it('returns positive composite score for consistently rising prices', async () => {
      const candles = generateCandles(300, 100, 'up');
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(candles);
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.trend).not.toBe('DOWNTREND');
    });

    it('returns negative composite score for consistently falling prices', async () => {
      const candles = generateCandles(300, 100, 'down');
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(candles);
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.compositeScore).toBeLessThan(0);
      expect(result.trend).not.toBe('UPTREND');
    });

    it('returns compositeScore within -1 to 1 range', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(300, 100, 'up'));
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.compositeScore).toBeGreaterThanOrEqual(-1);
      expect(result.compositeScore).toBeLessThanOrEqual(1);
    });

    it('populates indicators array with named entries', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(300));
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.indicators.length).toBeGreaterThan(5);
      for (const ind of result.indicators) {
        expect(ind.name).toBeTruthy();
        expect(ind.signal).toMatch(/^(BULLISH|BEARISH|NEUTRAL)$/);
        expect(ind.score).toBeGreaterThanOrEqual(-1);
        expect(ind.score).toBeLessThanOrEqual(1);
      }
    });

    it('uses API-provided RSI when available', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(300));
      (mockExternalData.getRSI as jest.Mock).mockResolvedValue(25); // oversold
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      const rsiInd = result.indicators.find((i) => i.name === 'RSI(14)');
      expect(rsiInd).toBeDefined();
      expect(rsiInd!.value).toBe(25);
      expect(rsiInd!.signal).toBe('BULLISH');
      expect(rsiInd!.score).toBeGreaterThan(0);
    });

    it('returns bearish RSI signal when overbought (RSI > 70)', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(300));
      (mockExternalData.getRSI as jest.Mock).mockResolvedValue(78);
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      const rsiInd = result.indicators.find((i) => i.name === 'RSI(14)');
      expect(rsiInd!.signal).toBe('BEARISH');
      expect(rsiInd!.score).toBeLessThan(0);
    });

    it('returns ATR value in result', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(300));
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.atr).toBeGreaterThan(0);
    });

    it('includes timestamp in result', async () => {
      (mockExternalData.getCandles as jest.Mock).mockResolvedValue(generateCandles(300));
      const result = await service.analyze('BTCUSD', 'CRYPTO', '1h');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('computeSupportResistance', () => {
    it('finds support and resistance levels in trending data', () => {
      const candles = generateCandles(200, 100);
      const { support, resistance } = service.computeSupportResistance(candles);
      expect(Array.isArray(support)).toBe(true);
      expect(Array.isArray(resistance)).toBe(true);
    });

    it('returns empty arrays for insufficient data', () => {
      const { support, resistance } = service.computeSupportResistance(generateCandles(5));
      expect(support).toHaveLength(0);
      expect(resistance).toHaveLength(0);
    });
  });
});
