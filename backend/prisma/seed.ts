import { PrismaClient, AssetCategory, DataSource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@trading.com' },
    update: { password: '$2b$10$cXnhLQK/GNmfnV98EWjGduSU33DZ40o0IoGyu0TKjo8J6sJ4NvsdS' },
    create: {
      email: 'demo@trading.com',
      username: 'demo',
      password: '$2b$10$cXnhLQK/GNmfnV98EWjGduSU33DZ40o0IoGyu0TKjo8J6sJ4NvsdS', // "password123"
      firstName: 'Demo',
      lastName: 'User',
      wallet: {
        create: {
          balance: 10000.00,
          equity: 10000.00,
          margin: 0.00,
          freeMargin: 10000.00,
          marginLevel: 0.00,
        },
      },
    },
  });

  console.log('✅ Demo user created');

  // ========== CRYPTOCURRENCY ASSETS ==========
  const cryptoAssets = [
    // Major Cryptocurrencies
    { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', baseAsset: 'BTC', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'BTCUSDT', isFeatured: true },
    { symbol: 'ETHUSD', name: 'Ethereum / U.S. Dollar', baseAsset: 'ETH', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'ETHUSDT', isFeatured: true },
    { symbol: 'BNBUSD', name: 'Binance Coin / U.S. Dollar', baseAsset: 'BNB', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'BNBUSDT' },
    { symbol: 'XRPUSD', name: 'Ripple / U.S. Dollar', baseAsset: 'XRP', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'XRPUSDT' },
    { symbol: 'ADAUSD', name: 'Cardano / U.S. Dollar', baseAsset: 'ADA', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'ADAUSDT' },
    { symbol: 'SOLUSD', name: 'Solana / U.S. Dollar', baseAsset: 'SOL', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'SOLUSDT', isFeatured: true },
    { symbol: 'DOTUSD', name: 'Polkadot / U.S. Dollar', baseAsset: 'DOT', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'DOTUSDT' },
    { symbol: 'DOGEUSD', name: 'Dogecoin / U.S. Dollar', baseAsset: 'DOGE', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'DOGEUSDT' },
    { symbol: 'MATICUSD', name: 'Polygon / U.S. Dollar', baseAsset: 'MATIC', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'MATICUSDT' },
    { symbol: 'AVAXUSD', name: 'Avalanche / U.S. Dollar', baseAsset: 'AVAX', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'AVAXUSDT' },
    { symbol: 'LINKUSD', name: 'Chainlink / U.S. Dollar', baseAsset: 'LINK', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'LINKUSDT' },
    { symbol: 'UNIUSD', name: 'Uniswap / U.S. Dollar', baseAsset: 'UNI', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'UNIUSDT' },
    { symbol: 'LTCUSD', name: 'Litecoin / U.S. Dollar', baseAsset: 'LTC', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'LTCUSDT' },
    { symbol: 'ATOMUSD', name: 'Cosmos / U.S. Dollar', baseAsset: 'ATOM', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'ATOMUSDT' },
    { symbol: 'ETCUSD', name: 'Ethereum Classic / U.S. Dollar', baseAsset: 'ETC', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'ETCUSDT' },
    { symbol: 'BCHUSD', name: 'Bitcoin Cash / U.S. Dollar', baseAsset: 'BCH', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'BCHUSDT' },
    { symbol: 'XLMUSD', name: 'Stellar / U.S. Dollar', baseAsset: 'XLM', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'XLMUSDT' },
    { symbol: 'TRXUSD', name: 'TRON / U.S. Dollar', baseAsset: 'TRX', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'TRXUSDT' },
    { symbol: 'VETU SD', name: 'VeChain / U.S. Dollar', baseAsset: 'VET', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'VETUSDT' },
    { symbol: 'FILUSD', name: 'Filecoin / U.S. Dollar', baseAsset: 'FIL', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'FILUSDT' },
    { symbol: 'APTUSD', name: 'Aptos / U.S. Dollar', baseAsset: 'APT', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'APTUSDT' },
    { symbol: 'ARBUSDT', name: 'Arbitrum / Tether', baseAsset: 'ARB', quoteAsset: 'USDT', broker: 'BINANCE', apiSymbol: 'ARBUSDT' },
    { symbol: 'OPUSD', name: 'Optimism / U.S. Dollar', baseAsset: 'OP', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'OPUSDT' },
    { symbol: 'NEARUSD', name: 'NEAR Protocol / U.S. Dollar', baseAsset: 'NEAR', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'NEARUSDT' },
    { symbol: 'ALGOUSD', name: 'Algorand / U.S. Dollar', baseAsset: 'ALGO', quoteAsset: 'USD', broker: 'BINANCE', apiSymbol: 'ALGOUSDT' },
  ];

  for (const asset of cryptoAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: {
        ...asset,
        category: AssetCategory.CRYPTO,
        dataSource: DataSource.BINANCE,
        minOrderSize: 0.001,
        maxLeverage: 125,
        spread: 0.0001,
        commission: 0.001,
      },
    });
  }

  console.log(`✅ Created ${cryptoAssets.length} cryptocurrency assets`);

  // ========== FOREX PAIRS ==========
  const forexAssets = [
    // Major Pairs
    { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', baseAsset: 'EUR', quoteAsset: 'USD', broker: 'PEPPERSTONE', isFeatured: true },
    { symbol: 'GBPUSD', name: 'British Pound / U.S. Dollar', baseAsset: 'GBP', quoteAsset: 'USD', broker: 'PEPPERSTONE', isFeatured: true },
    { symbol: 'USDJPY', name: 'U.S. Dollar / Japanese Yen', baseAsset: 'USD', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
    { symbol: 'USDCHF', name: 'U.S. Dollar / Swiss Franc', baseAsset: 'USD', quoteAsset: 'CHF', broker: 'PEPPERSTONE' },
    { symbol: 'AUDUSD', name: 'Australian Dollar / U.S. Dollar', baseAsset: 'AUD', quoteAsset: 'USD', broker: 'PEPPERSTONE' },
    { symbol: 'USDCAD', name: 'U.S. Dollar / Canadian Dollar', baseAsset: 'USD', quoteAsset: 'CAD', broker: 'PEPPERSTONE' },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar / U.S. Dollar', baseAsset: 'NZD', quoteAsset: 'USD', broker: 'PEPPERSTONE' },
    
    // Cross Pairs
    { symbol: 'EURGBP', name: 'Euro / British Pound', baseAsset: 'EUR', quoteAsset: 'GBP', broker: 'PEPPERSTONE' },
    { symbol: 'EURJPY', name: 'Euro / Japanese Yen', baseAsset: 'EUR', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
    { symbol: 'EURCHF', name: 'Euro / Swiss Franc', baseAsset: 'EUR', quoteAsset: 'CHF', broker: 'PEPPERSTONE' },
    { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', baseAsset: 'GBP', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
    { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', baseAsset: 'GBP', quoteAsset: 'CHF', broker: 'PEPPERSTONE' },
    { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', baseAsset: 'AUD', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
    { symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', baseAsset: 'AUD', quoteAsset: 'NZD', broker: 'PEPPERSTONE' },
    { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', baseAsset: 'AUD', quoteAsset: 'CAD', broker: 'PEPPERSTONE' },
    { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', baseAsset: 'NZD', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
    { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', baseAsset: 'CAD', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
    { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', baseAsset: 'CHF', quoteAsset: 'JPY', broker: 'PEPPERSTONE' },
  ];

  for (const asset of forexAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: {
        ...asset,
        category: AssetCategory.FOREX,
        dataSource: DataSource.YAHOO_FINANCE,
        minOrderSize: 0.01,
        maxLeverage: 500,
        spread: 0.00002,
        commission: 0.00007,
      },
    });
  }

  console.log(`✅ Created ${forexAssets.length} forex pairs`);

  // ========== COMMODITIES ==========
  const commodityAssets = [
    { symbol: 'XAUUSD', name: 'Gold Spot / U.S. Dollar', baseAsset: 'XAU', quoteAsset: 'USD', broker: 'PEPPERSTONE', apiSymbol: 'GC=F', isFeatured: true },
    { symbol: 'XAGUSD', name: 'Silver Spot / U.S. Dollar', baseAsset: 'XAG', quoteAsset: 'USD', broker: 'PEPPERSTONE', apiSymbol: 'SI=F' },
    { symbol: 'XPTUSD', name: 'Platinum / U.S. Dollar', baseAsset: 'XPT', quoteAsset: 'USD', broker: 'OANDA', apiSymbol: 'PL=F' },
    { symbol: 'XPDUSD', name: 'Palladium / U.S. Dollar', baseAsset: 'XPD', quoteAsset: 'USD', broker: 'OANDA', apiSymbol: 'PA=F' },
    { symbol: 'USOIL', name: 'Crude Oil WTI', baseAsset: 'OIL', quoteAsset: 'USD', broker: 'PEPPERSTONE', apiSymbol: 'CL=F', isFeatured: true },
    { symbol: 'UKOIL', name: 'Brent Crude Oil', baseAsset: 'BRENT', quoteAsset: 'USD', broker: 'PEPPERSTONE', apiSymbol: 'BZ=F' },
    { symbol: 'NATGAS', name: 'Natural Gas', baseAsset: 'NG', quoteAsset: 'USD', broker: 'CME', apiSymbol: 'NG=F' },
    { symbol: 'COPPER', name: 'Copper', baseAsset: 'CU', quoteAsset: 'USD', broker: 'CME', apiSymbol: 'HG=F' },
  ];

  for (const asset of commodityAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: {
        ...asset,
        category: AssetCategory.COMMODITIES,
        dataSource: DataSource.YAHOO_FINANCE,
        minOrderSize: 0.01,
        maxLeverage: 200,
        spread: 0.02,
        commission: 0.0005,
      },
    });
  }

  console.log(`✅ Created ${commodityAssets.length} commodity assets`);

  // ========== STOCK INDICES ==========
  const indexAssets = [
    { symbol: 'US30', name: 'Dow Jones Industrial Average', broker: 'NYSE', apiSymbol: '^DJI', isFeatured: true },
    { symbol: 'US500', name: 'S&P 500', broker: 'NYSE', apiSymbol: '^GSPC', isFeatured: true },
    { symbol: 'NAS100', name: 'NASDAQ 100', broker: 'NASDAQ', apiSymbol: '^NDX', isFeatured: true },
    { symbol: 'US2000', name: 'Russell 2000', broker: 'NYSE', apiSymbol: '^RUT' },
    { symbol: 'UK100', name: 'FTSE 100', broker: 'LSE', apiSymbol: '^FTSE' },
    { symbol: 'GER40', name: 'DAX', broker: 'XETRA', apiSymbol: '^GDAXI' },
    { symbol: 'FRA40', name: 'CAC 40', broker: 'EURONEXT', apiSymbol: '^FCHI' },
    { symbol: 'JPN225', name: 'Nikkei 225', broker: 'TSE', apiSymbol: '^N225' },
    { symbol: 'AUS200', name: 'ASX 200', broker: 'ASX', apiSymbol: '^AXJO' },
    { symbol: 'HK50', name: 'Hang Seng Index', broker: 'HKEX', apiSymbol: '^HSI' },
    { symbol: 'CHINA50', name: 'FTSE China A50', broker: 'SGX', apiSymbol: '000001.SS' },
    { symbol: 'INDIA50', name: 'Nifty 50', broker: 'NSE', apiSymbol: '^NSEI' },
  ];

  for (const asset of indexAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: {
        ...asset,
        name: asset.name,
        category: AssetCategory.INDICES,
        dataSource: DataSource.YAHOO_FINANCE,
        minOrderSize: 0.1,
        maxLeverage: 100,
        spread: 0.5,
        commission: 0.0002,
      },
    });
  }

  console.log(`✅ Created ${indexAssets.length} index assets`);

  // ========== MAJOR US STOCKS ==========
  const stockAssets = [
    // Tech Giants (FAANG+)
    { symbol: 'AAPL', name: 'Apple Inc.', broker: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', broker: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', broker: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', broker: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms Inc.', broker: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', broker: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', broker: 'NASDAQ' },
    { symbol: 'NFLX', name: 'Netflix Inc.', broker: 'NASDAQ' },
    
    // Major Banks & Finance
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', broker: 'NYSE' },
    { symbol: 'BAC', name: 'Bank of America Corp.', broker: 'NYSE' },
    { symbol: 'WFC', name: 'Wells Fargo & Company', broker: 'NYSE' },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc.', broker: 'NYSE' },
    { symbol: 'MS', name: 'Morgan Stanley', broker: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', broker: 'NYSE' },
    { symbol: 'MA', name: 'Mastercard Inc.', broker: 'NYSE' },
    { symbol: 'AXP', name: 'American Express Company', broker: 'NYSE' },
    
    // Healthcare
    { symbol: 'JNJ', name: 'Johnson & Johnson', broker: 'NYSE' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', broker: 'NYSE' },
    { symbol: 'PFE', name: 'Pfizer Inc.', broker: 'NYSE' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', broker: 'NYSE' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', broker: 'NYSE' },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', broker: 'NYSE' },
    
    // Consumer
    { symbol: 'WMT', name: 'Walmart Inc.', broker: 'NYSE' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', broker: 'NYSE' },
    { symbol: 'KO', name: 'Coca-Cola Company', broker: 'NYSE' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', broker: 'NASDAQ' },
    { symbol: 'COST', name: 'Costco Wholesale Corp.', broker: 'NASDAQ' },
    { symbol: 'NKE', name: 'Nike Inc.', broker: 'NYSE' },
    { symbol: 'MCD', name: 'McDonald\'s Corporation', broker: 'NYSE' },
    { symbol: 'SBUX', name: 'Starbucks Corporation', broker: 'NASDAQ' },
    
    // Industrial & Energy
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', broker: 'NYSE' },
    { symbol: 'CVX', name: 'Chevron Corporation', broker: 'NYSE' },
    { symbol: 'BA', name: 'Boeing Company', broker: 'NYSE' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', broker: 'NYSE' },
    { symbol: 'GE', name: 'General Electric Company', broker: 'NYSE' },
    
    // Entertainment & Media
    { symbol: 'DIS', name: 'Walt Disney Company', broker: 'NYSE' },
    { symbol: 'CMCSA', name: 'Comcast Corporation', broker: 'NASDAQ' },
    
    // Semiconductors
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', broker: 'NASDAQ' },
    { symbol: 'INTC', name: 'Intel Corporation', broker: 'NASDAQ' },
    { symbol: 'QCOM', name: 'QUALCOMM Inc.', broker: 'NASDAQ' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', broker: 'NASDAQ' },
    
    // Other Tech
    { symbol: 'CRM', name: 'Salesforce Inc.', broker: 'NYSE' },
    { symbol: 'ADBE', name: 'Adobe Inc.', broker: 'NASDAQ' },
    { symbol: 'ORCL', name: 'Oracle Corporation', broker: 'NYSE' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', broker: 'NASDAQ' },
    { symbol: 'IBM', name: 'International Business Machines', broker: 'NYSE' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.', broker: 'NASDAQ' },
    { symbol: 'UBER', name: 'Uber Technologies Inc.', broker: 'NYSE' },
    { symbol: 'SQ', name: 'Block Inc.', broker: 'NYSE' },
    { symbol: 'SHOP', name: 'Shopify Inc.', broker: 'NYSE' },
    { symbol: 'SNOW', name: 'Snowflake Inc.', broker: 'NYSE' },
  ];

  for (const asset of stockAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: {
        symbol: asset.symbol,
        name: asset.name,
        broker: asset.broker,
        category: AssetCategory.STOCKS,
        dataSource: DataSource.YAHOO_FINANCE,
        apiSymbol: asset.symbol,
        minOrderSize: 1,
        maxLeverage: 5,
        spread: 0.01,
        commission: 0.001,
      },
    });
  }

  console.log(`✅ Created ${stockAssets.length} stock assets`);

  // ========== ETFs / FUNDS ==========
  const etfAssets = [
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', broker: 'NYSE Arca' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust Series 1', broker: 'NASDAQ' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', broker: 'NYSE Arca' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', broker: 'NYSE Arca' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', broker: 'NYSE Arca' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', broker: 'NYSE Arca' },
    { symbol: 'SLV', name: 'iShares Silver Trust', broker: 'NYSE Arca' },
    { symbol: 'USO', name: 'United States Oil Fund', broker: 'NYSE Arca' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', broker: 'NASDAQ' },
    { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', broker: 'NYSE Arca' },
  ];

  for (const asset of etfAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: {
        symbol: asset.symbol,
        name: asset.name,
        broker: asset.broker,
        category: AssetCategory.FUNDS,
        dataSource: DataSource.YAHOO_FINANCE,
        apiSymbol: asset.symbol,
        minOrderSize: 1,
        maxLeverage: 3,
        spread: 0.01,
        commission: 0.0005,
      },
    });
  }

  console.log(`✅ Created ${etfAssets.length} ETF/fund assets`);

  console.log('🎉 Database seeding completed successfully!');
  console.log(`📊 Total assets created: ${cryptoAssets.length + forexAssets.length + commodityAssets.length + indexAssets.length + stockAssets.length + etfAssets.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
