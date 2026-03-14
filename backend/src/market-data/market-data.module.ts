import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataGateway } from './market-data.gateway';
import { MarketDataController } from './market-data.controller';

@Module({
  providers: [MarketDataService, MarketDataGateway],
  controllers: [MarketDataController],
  exports: [MarketDataService, MarketDataGateway],
})
export class MarketDataModule {}
