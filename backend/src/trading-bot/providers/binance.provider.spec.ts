import { Test, TestingModule } from '@nestjs/testing';
import { BinanceProvider } from './binance.provider';

describe('BinanceProvider', () => {
  let provider: BinanceProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BinanceProvider],
    }).compile();
    provider = module.get<BinanceProvider>(BinanceProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('getName returns Binance', () => {
    expect(provider.getName()).toBe('Binance');
  });

  describe('getCandles', () => {
    it('maps kline response to OHLCVCandle format', async () => {
      const mockKline = [
        [1700000000000, '45000.00', '45500.00', '44800.00', '45200.00', '100.5'],
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({ data: mockKline }),
      };

      const candles = await provider.getCandles('BTCUSD', '1h');
      expect(candles).toHaveLength(1);
      expect(candles[0]).toMatchObject({
        time: 1700000000,
        open: 45000,
        high: 45500,
        low: 44800,
        close: 45200,
        volume: 100.5,
      });
    });

    it('returns empty array and marks unavailable on error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const candles = await provider.getCandles('BTCUSD', '1h');
      expect(candles).toEqual([]);
      expect(provider.isAvailable()).toBe(false);
    });

    it('maps internal symbol to Binance symbol', async () => {
      let capturedParams: Record<string, unknown> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockImplementation((_url: string, config: { params: Record<string, unknown> }) => {
          capturedParams = config.params;
          return Promise.resolve({ data: [] });
        }),
      };

      await provider.getCandles('BTCUSD', '1h');
      expect(capturedParams.symbol).toBe('BTCUSDT');
    });
  });

  describe('getOrderBook', () => {
    it('returns formatted order book', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({
          data: {
            bids: [['45000', '0.5'], ['44999', '1.0']],
            asks: [['45001', '0.3'], ['45002', '0.8']],
          },
        }),
      };

      const book = await provider.getOrderBook('BTCUSD', 20);
      expect(book).not.toBeNull();
      expect(book!.bids).toHaveLength(2);
      expect(book!.asks).toHaveLength(2);
      expect(book!.bids[0]).toMatchObject({ price: 45000, quantity: 0.5 });
    });

    it('returns null on error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockRejectedValue(new Error('API down')),
      };

      const book = await provider.getOrderBook('BTCUSD');
      expect(book).toBeNull();
    });
  });
});
