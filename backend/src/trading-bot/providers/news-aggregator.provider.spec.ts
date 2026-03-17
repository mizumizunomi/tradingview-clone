import { Test, TestingModule } from '@nestjs/testing';
import { NewsAggregatorProvider } from './news-aggregator.provider';

describe('NewsAggregatorProvider', () => {
  let provider: NewsAggregatorProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsAggregatorProvider],
    }).compile();
    provider = module.get<NewsAggregatorProvider>(NewsAggregatorProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('getName returns NewsAggregator', () => {
    expect(provider.getName()).toBe('NewsAggregator');
  });

  describe('getNews', () => {
    it('returns cached results on second call', async () => {
      const mockFinnhubArticles = [
        {
          id: 1,
          headline: 'Bitcoin surges to new all-time high',
          summary: 'BTC rallies strongly as institutional demand grows',
          source: 'CoinDesk',
          url: 'https://example.com/1',
          datetime: Math.floor(Date.now() / 1000),
        },
      ];

      const mockGet = jest.fn().mockResolvedValue({ data: mockFinnhubArticles });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).finnhubClient = { get: mockGet };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).FINNHUB_KEY = 'test-key';

      // Use unique query to avoid cross-test cache collisions
      await provider.getNews('BTCUSD_CACHE_TEST', 10);
      const callCount1 = mockGet.mock.calls.length;

      await provider.getNews('BTCUSD_CACHE_TEST', 10);
      const callCount2 = mockGet.mock.calls.length;

      expect(callCount2).toBe(callCount1); // no additional calls — cache hit
    });

    it('returns empty array gracefully when all sources fail', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).FINNHUB_KEY = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).NEWS_API_KEY = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).finnhubClient = { get: jest.fn().mockRejectedValue(new Error('Network error')) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).newsApiClient = { get: jest.fn().mockRejectedValue(new Error('Network error')) };

      // Clear cache and use a unique key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).cache.clear();

      // Override the RSS fallback to fail too
      const privateFetchRss = jest.spyOn(provider as any, 'fetchPublicRssNews').mockResolvedValue([]);

      const news = await provider.getNews('BTCUSD_FAIL_TEST', 5);
      expect(Array.isArray(news)).toBe(true);

      privateFetchRss.mockRestore();
    });
  });

  describe('getNewsSentimentScore', () => {
    it('returns 0 when no news available', async () => {
      jest.spyOn(provider, 'getNews').mockResolvedValue([]);
      const score = await provider.getNewsSentimentScore('NEWNEWSYMBOL_EMPTY');
      expect(score).toBe(0);
    });

    it('returns positive score for bullish news', async () => {
      jest.spyOn(provider, 'getNews').mockResolvedValue([
        {
          id: '1', headline: 'Bitcoin surges to record high rally', summary: 'Strong bullish momentum',
          source: 'test', url: '', publishedAt: new Date(), sentiment: 0.8, relevance: 1,
        },
        {
          id: '2', headline: 'Crypto market gains strong growth', summary: 'Buy signal breakout',
          source: 'test', url: '', publishedAt: new Date(), sentiment: 0.6, relevance: 1,
        },
      ]);
      const score = await provider.getNewsSentimentScore('BTC_BULL');
      expect(score).toBeGreaterThan(0);
    });

    it('returns score within -1 to 1 range', async () => {
      jest.spyOn(provider, 'getNews').mockResolvedValue([
        {
          id: '1', headline: 'Market crash plunge loss bear breakdown', summary: 'Very bearish',
          source: 'test', url: '', publishedAt: new Date(), sentiment: -0.9, relevance: 1,
        },
      ]);
      const score = await provider.getNewsSentimentScore('BTC_BEAR');
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});
