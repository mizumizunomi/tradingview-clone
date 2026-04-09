import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import { MarketDataGateway } from './market-data.gateway';
import { MarketDataController } from './market-data.controller';

@Module({
  imports: [ConfigModule, JwtModule],
  providers: [MarketDataService, MarketDataGateway],
  controllers: [MarketDataController],
  exports: [MarketDataService, MarketDataGateway],
})
export class MarketDataModule {}
