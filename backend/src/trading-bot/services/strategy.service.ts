import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ExternalDataService } from './external-data.service';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { CreateStrategyDto, UpdateStrategyDto } from '../dto/create-strategy.dto';
import { BacktestResult, AssetClass } from '../interfaces/signal.interface';
import { OHLCVCandle } from '../interfaces/provider.interface';

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly externalData: ExternalDataService,
    private readonly technicalAnalysis: TechnicalAnalysisService,
  ) {}

  async getStrategies(userId: string) {
    return this.prisma.botStrategy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStrategy(userId: string, id: string) {
    const strategy = await this.prisma.botStrategy.findFirst({ where: { id, userId } });
    if (!strategy) throw new NotFoundException('Strategy not found');
    return strategy;
  }

  async createStrategy(userId: string, dto: CreateStrategyDto) {
    return this.prisma.botStrategy.create({
      data: {
        userId,
        name: dto.name,
        assetClass: dto.assetClass,
        indicators: dto.indicators as Prisma.InputJsonValue,
        rules: dto.rules as Prisma.InputJsonValue,
        riskParams: dto.riskParams as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateStrategy(userId: string, id: string, dto: UpdateStrategyDto) {
    await this.getStrategy(userId, id);
    return this.prisma.botStrategy.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.indicators && { indicators: dto.indicators as Prisma.InputJsonValue }),
        ...(dto.rules && { rules: dto.rules as Prisma.InputJsonValue }),
        ...(dto.riskParams && { riskParams: dto.riskParams as Prisma.InputJsonValue }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteStrategy(userId: string, id: string) {
    await this.getStrategy(userId, id);
    return this.prisma.botStrategy.delete({ where: { id } });
  }

  async backtest(
    userId: string,
    strategyId: string,
    symbol: string,
    timeframe = '1h',
    lookbackDays = 90,
  ): Promise<BacktestResult> {
    const strategy = await this.getStrategy(userId, strategyId);
    const assetClass = strategy.assetClass as AssetClass;

    // Fetch historical candles
    const limit = Math.min(1000, Math.floor((lookbackDays * 24) / this.timeframeToHours(timeframe)));
    const candles = await this.externalData.getCandles(symbol, timeframe, assetClass, limit);

    if (candles.length < 30) {
      return this.emptyBacktestResult();
    }

    const riskParams = strategy.riskParams as Record<string, number>;
    const stopLossPercent = (riskParams.stopLossPercent ?? 2) / 100;
    const takeProfitPercent = (riskParams.takeProfitPercent ?? 5) / 100;
    const initialCapital = 10_000;

    return this.runBacktest(candles, stopLossPercent, takeProfitPercent, initialCapital);
  }

  private runBacktest(
    candles: OHLCVCandle[],
    stopLossPercent: number,
    takeProfitPercent: number,
    initialCapital: number,
  ): BacktestResult {
    const equityCurve: Array<{ date: Date; equity: number }> = [];
    const trades: BacktestResult['trades'] = [];
    let equity = initialCapital;
    let position: { entryPrice: number; side: 'LONG' | 'SHORT'; stopLoss: number; takeProfit: number } | null = null;
    let wins = 0, losses = 0;
    let maxEquity = initialCapital;
    let maxDrawdown = 0;

    // Simple RSI-based backtest strategy
    for (let i = 20; i < candles.length; i++) {
      const slice = candles.slice(i - 20, i);
      const rsi = this.localRSI(slice.map((c) => c.close), 14);
      const close = candles[i].close;

      if (!position) {
        if (rsi < 30) {
          // Buy signal
          position = {
            entryPrice: close,
            side: 'LONG',
            stopLoss: close * (1 - stopLossPercent),
            takeProfit: close * (1 + takeProfitPercent),
          };
        } else if (rsi > 70) {
          // Sell signal
          position = {
            entryPrice: close,
            side: 'SHORT',
            stopLoss: close * (1 + stopLossPercent),
            takeProfit: close * (1 - takeProfitPercent),
          };
        }
      } else {
        let exitPrice: number | null = null;
        let exitReason = '';

        if (position.side === 'LONG') {
          if (candles[i].low <= position.stopLoss) {
            exitPrice = position.stopLoss;
            exitReason = 'Stop Loss';
          } else if (candles[i].high >= position.takeProfit) {
            exitPrice = position.takeProfit;
            exitReason = 'Take Profit';
          }
        } else {
          if (candles[i].high >= position.stopLoss) {
            exitPrice = position.stopLoss;
            exitReason = 'Stop Loss';
          } else if (candles[i].low <= position.takeProfit) {
            exitPrice = position.takeProfit;
            exitReason = 'Take Profit';
          }
        }

        if (exitPrice !== null) {
          const pnlPercent = position.side === 'LONG'
            ? (exitPrice - position.entryPrice) / position.entryPrice
            : (position.entryPrice - exitPrice) / position.entryPrice;
          const pnl = equity * pnlPercent;
          equity += pnl;
          if (pnl > 0) wins++; else losses++;

          trades.push({
            date: new Date(candles[i].time * 1000),
            action: position.side === 'LONG' ? 'SELL' : 'BUY',
            price: exitPrice,
            pnl,
            reason: exitReason,
          });

          maxEquity = Math.max(maxEquity, equity);
          const drawdown = (maxEquity - equity) / maxEquity;
          maxDrawdown = Math.max(maxDrawdown, drawdown);
          position = null;
        }
      }

      equityCurve.push({ date: new Date(candles[i].time * 1000), equity });
    }

    const totalReturn = equity - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;
    const winRate = trades.length > 0 ? wins / trades.length : 0;
    const avgWin = wins > 0
      ? trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins : 0;
    const avgLoss = losses > 0
      ? Math.abs(trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) / losses) : 0;

    // Simplified Sharpe ratio
    const returns = equityCurve.map((_, i, arr) =>
      i === 0 ? 0 : (arr[i].equity - arr[i - 1].equity) / arr[i - 1].equity
    );
    const avgReturn = returns.reduce((s, v) => s + v, 0) / returns.length;
    const stdReturn = Math.sqrt(
      returns.reduce((s, v) => s + (v - avgReturn) ** 2, 0) / returns.length
    );
    const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

    return {
      totalReturn,
      totalReturnPercent,
      winRate,
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown * 100,
      sharpeRatio,
      tradeCount: trades.length,
      winCount: wins,
      lossCount: losses,
      avgWin,
      avgLoss,
      equityCurve,
      trades,
    };
  }

  private localRSI(closes: number[], period = 14): number {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  private timeframeToHours(timeframe: string): number {
    const map: Record<string, number> = {
      '1m': 1 / 60, '5m': 5 / 60, '15m': 0.25, '30m': 0.5,
      '1h': 1, '4h': 4, '1d': 24, '1w': 168,
    };
    return map[timeframe] ?? 1;
  }

  private emptyBacktestResult(): BacktestResult {
    return {
      totalReturn: 0, totalReturnPercent: 0, winRate: 0,
      maxDrawdown: 0, maxDrawdownPercent: 0, sharpeRatio: 0,
      tradeCount: 0, winCount: 0, lossCount: 0, avgWin: 0, avgLoss: 0,
      equityCurve: [], trades: [],
    };
  }
}
