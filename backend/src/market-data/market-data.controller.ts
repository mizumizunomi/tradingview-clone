import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketDataService, PriceData } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private marketDataService: MarketDataService) {}

  @Get('prices')
  getPrices(): PriceData[] {
    return this.marketDataService.getAllPrices();
  }

  @Get('price/:symbol')
  getPrice(@Param('symbol') symbol: string): PriceData | undefined {
    return this.marketDataService.getPrice(symbol);
  }

  @Get('candles/:symbol')
  async getCandles(
    @Param('symbol') symbol: string,
    @Query('timeframe') timeframe: string = '1h',
  ) {
    return this.marketDataService.getCandles(symbol, timeframe);
  }
}
