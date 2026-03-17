import { Test, TestingModule } from '@nestjs/testing';
import { CoinGeckoProvider } from './coingecko.provider';

describe('CoinGeckoProvider', () => {
  let provider: CoinGeckoProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinGeckoProvider],
    }).compile();
    provider = module.get<CoinGeckoProvider>(CoinGeckoProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('getName returns CoinGecko', () => {
    expect(provider.getName()).toBe('CoinGecko');
  });

  describe('getFundamentals', () => {
    it('returns null for unknown symbol', async () => {
      const result = await provider.getFundamentals('UNKNOWNSYMBOL');
      expect(result).toBeNull();
    });

    it('fetches fundamentals for BTCUSD', async () => {
      const mockData = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_cap_rank: 1,
        developer_score: 100,
        community_score: 80,
        liquidity_score: 99,
        public_interest_score: 0.5,
        market_data: {
          market_cap: { usd: 1_000_000_000_000 },
          total_volume: { usd: 30_000_000_000 },
          price_change_percentage_24h: 2.5,
          price_change_percentage_7d: 5.0,
          circulating_supply: 19_000_000,
          total_supply: 21_000_000,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({ data: mockData }),
      };

      const result = await provider.getFundamentals('BTCUSD');
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('BTC');
      expect(result!.marketCap).toBe(1_000_000_000_000);
      expect(result!.marketCapRank).toBe(1);
      expect(result!.priceChangePercent24h).toBe(2.5);
    });

    it('returns null and marks unavailable on API error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockRejectedValue(new Error('429 Too Many Requests')),
      };

      const result = await provider.getFundamentals('ETHUSD');
      expect(result).toBeNull();
      expect(provider.isAvailable()).toBe(false);
    });

    it('caches results on second call', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          id: 'ethereum', symbol: 'eth', name: 'Ethereum',
          market_cap_rank: 2, developer_score: 90, community_score: 75,
          liquidity_score: 95, public_interest_score: 0.3,
          market_data: {
            market_cap: { usd: 200_000_000_000 },
            total_volume: { usd: 10_000_000_000 },
            price_change_percentage_24h: 1.0,
            circulating_supply: 120_000_000,
            total_supply: null,
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = { get: mockGet };

      await provider.getFundamentals('ETHUSD');
      await provider.getFundamentals('ETHUSD');
      expect(mockGet).toHaveBeenCalledTimes(1); // second call hits cache
    });
  });

  describe('getTrending', () => {
    it('returns array of symbol strings', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockResolvedValue({
          data: {
            coins: [
              { item: { symbol: 'BTC' } },
              { item: { symbol: 'ETH' } },
              { item: { symbol: 'SOL' } },
            ],
          },
        }),
      };

      const trending = await provider.getTrending();
      expect(trending).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it('returns empty array on error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).client = {
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const trending = await provider.getTrending();
      expect(trending).toEqual([]);
    });
  });
});
