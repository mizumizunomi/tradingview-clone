import { Test, TestingModule } from '@nestjs/testing';
import { BybitProvider } from './bybit.provider';

describe('BybitProvider', () => {
  let provider: BybitProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BybitProvider],
    }).compile();
    provider = module.get<BybitProvider>(BybitProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('getName returns Bybit', () => {
    expect(provider.getName()).toBe('Bybit');
  });

  describe('getCandles', () => {
    it('parses Bybit kline format correctly (newest first → reversed)', async () => {
      const mockList = [
        ['1700007200000', '45200.00', '45600.00', '45100.00', '45400.00', '80.0'],
        ['1700003600000', '44800.00', '45300.00', '44700.00', '45200.00', '120.0'],
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({
          data: { retCode: 0, result: { list: mockList } },
        }),
      };

      const candles = await provider.getCandles('BTCUSD', '1h');
      expect(candles).toHaveLength(2);
      // After reversal, older candle should be first
      expect(candles[0].time).toBe(1700003600);
      expect(candles[1].time).toBe(1700007200);
    });

    it('returns empty array on non-zero retCode', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({
          data: { retCode: 10001, retMsg: 'Not supported symbols' },
        }),
      };

      const candles = await provider.getCandles('BTCUSD', '1h');
      expect(candles).toEqual([]);
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns empty array on network error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockRejectedValue(new Error('timeout')),
      };

      const candles = await provider.getCandles('BTCUSD', '1h');
      expect(candles).toEqual([]);
    });
  });

  describe('getOrderBook', () => {
    it('returns order book with bids and asks', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({
          data: {
            retCode: 0,
            result: {
              b: [['45000', '0.5'], ['44999', '1.0']],
              a: [['45001', '0.3']],
              ts: 1700000000000,
            },
          },
        }),
      };

      const book = await provider.getOrderBook('BTCUSD');
      expect(book).not.toBeNull();
      expect(book!.bids[0]).toMatchObject({ price: 45000, quantity: 0.5 });
      expect(book!.asks[0]).toMatchObject({ price: 45001, quantity: 0.3 });
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
