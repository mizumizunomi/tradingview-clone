import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { MarketDataModule } from './market-data/market-data.module';
import { TradingModule } from './trading/trading.module';
import { WalletModule } from './wallet/wallet.module';
import { NewsModule } from './news/news.module';
import { TradingBotModule } from './trading-bot/trading-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AssetsModule,
    MarketDataModule,
    TradingModule,
    WalletModule,
    NewsModule,
    TradingBotModule,
  ],
})
export class AppModule {}
