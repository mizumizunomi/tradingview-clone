import { Module, OnModuleInit } from '@nestjs/common';
import { TradingService } from './trading.service';
import { TradingController } from './trading.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { MarketDataGateway } from '../market-data/market-data.gateway';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [MarketDataModule, PlanModule],
  providers: [TradingService],
  controllers: [TradingController],
  exports: [TradingService],
})
export class TradingModule implements OnModuleInit {
  constructor(
    private tradingService: TradingService,
    private gateway: MarketDataGateway,
  ) {}

  onModuleInit() {
    this.tradingService.setPositionClosedCallback((userId, positionId, pnl) => {
      this.gateway.emitToUser(userId, 'position:closed', { positionId, pnl });
    });
    this.tradingService.setEquityUpdateCallback((userId, equity, freeMargin, margin) => {
      this.gateway.emitToUser(userId, 'wallet:update', { equity, freeMargin, margin });
    });
  }
}
