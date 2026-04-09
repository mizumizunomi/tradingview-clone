import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { MarketDataModule } from './market-data/market-data.module';
import { TradingModule } from './trading/trading.module';
import { WalletModule } from './wallet/wallet.module';
import { NewsModule } from './news/news.module';
import { TradingBotModule } from './trading-bot/trading-bot.module';
import { PlanModule } from './plan/plan.module';
import { SupportModule } from './support/support.module';
import { KycModule } from './kyc/kyc.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 60000, limit: 30 },
      { name: 'long', ttl: 3600000, limit: 500 },
    ]),
    PrismaModule,
    AuthModule,
    AssetsModule,
    MarketDataModule,
    TradingModule,
    WalletModule,
    NewsModule,
    TradingBotModule,
    PlanModule,
    SupportModule,
    KycModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
