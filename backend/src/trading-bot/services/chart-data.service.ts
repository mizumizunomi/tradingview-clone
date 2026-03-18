import { Injectable } from '@nestjs/common';
import {
  ChartDrawingSet, ChartDrawing, HorizontalLine, Arrow, Zone, FibonacciSet,
} from '../interfaces/chart-drawing.interface';
import { SupportResistanceLevel } from './level-detection.service';
import { SignalAction, TechnicalAnalysisResult } from '../interfaces/signal.interface';

interface LevelConfig {
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
}

interface FibData {
  highPrice: number;
  highTime: number;
  lowPrice: number;
  lowTime: number;
  levels: { ratio: number; price: number; label: string }[];
}

@Injectable()
export class ChartDataService {
  /**
   * Build a complete ChartDrawingSet from analysis results.
   */
  buildDrawingSet(params: {
    asset: string;
    timeframe: string;
    action: SignalAction;
    confidence: number;
    levels: LevelConfig;
    fib?: FibData | null;
    ta: TechnicalAnalysisResult;
    currentTime: number;
    currentPrice: number;
  }): ChartDrawingSet {
    const { asset, timeframe, action, confidence, levels, fib, ta, currentTime, currentPrice } = params;
    const drawings: ChartDrawing[] = [];
    let idCounter = 0;
    const uid = () => `bot_${Date.now()}_${idCounter++}`;

    // ── Support levels ──────────────────────────────────────────────────────
    for (const s of levels.supports) {
      const line: HorizontalLine = {
        type: 'horizontal_line',
        id: uid(),
        price: s.price,
        label: `Support $${this.fmtPrice(s.price)}`,
        style: 'dashed',
        color: '#26a69a',
        thickness: s.strength > 0.7 ? 2 : 1,
        category: 'support',
        annotation: `Support at $${this.fmtPrice(s.price)} — tested ${s.touches} time${s.touches !== 1 ? 's' : ''}. Strength: ${(s.strength * 100).toFixed(0)}%`,
      };
      drawings.push(line);
    }

    // ── Resistance levels ──────────────────────────────────────────────────
    for (const r of levels.resistances) {
      const line: HorizontalLine = {
        type: 'horizontal_line',
        id: uid(),
        price: r.price,
        label: `Resistance $${this.fmtPrice(r.price)}`,
        style: 'dashed',
        color: '#ef5350',
        thickness: r.strength > 0.7 ? 2 : 1,
        category: 'resistance',
        annotation: `Resistance at $${this.fmtPrice(r.price)} — tested ${r.touches} time${r.touches !== 1 ? 's' : ''}. Strength: ${(r.strength * 100).toFixed(0)}%`,
      };
      drawings.push(line);
    }

    // ── Entry point ─────────────────────────────────────────────────────────
    if (levels.entry && action !== 'HOLD') {
      const entryLine: HorizontalLine = {
        type: 'horizontal_line',
        id: uid(),
        price: levels.entry,
        label: `Entry $${this.fmtPrice(levels.entry)}`,
        style: 'solid',
        color: action === 'BUY' ? '#2962ff' : '#ff6d00',
        thickness: 2,
        category: 'entry',
        annotation: `${action} entry at $${this.fmtPrice(levels.entry)}. Confidence: ${(confidence * 100).toFixed(0)}%`,
      };
      drawings.push(entryLine);
    }

    // ── Stop-loss ────────────────────────────────────────────────────────────
    if (levels.stopLoss && action !== 'HOLD') {
      const slLine: HorizontalLine = {
        type: 'horizontal_line',
        id: uid(),
        price: levels.stopLoss,
        label: `SL $${this.fmtPrice(levels.stopLoss)}`,
        style: 'solid',
        color: '#ef5350',
        thickness: 2,
        category: 'stop_loss',
        annotation: `Stop-loss at $${this.fmtPrice(levels.stopLoss)}. Risk: ${levels.entry ? ((Math.abs(levels.entry - levels.stopLoss) / levels.entry) * 100).toFixed(2) : '—'}%`,
      };
      drawings.push(slLine);
    }

    // ── Take-profit levels ──────────────────────────────────────────────────
    if (levels.takeProfit1 && action !== 'HOLD') {
      drawings.push({
        type: 'horizontal_line',
        id: uid(),
        price: levels.takeProfit1,
        label: `TP1 $${this.fmtPrice(levels.takeProfit1)}`,
        style: 'solid',
        color: '#26a69a',
        thickness: 2,
        category: 'take_profit',
        annotation: `Take-profit 1 at $${this.fmtPrice(levels.takeProfit1)}. Reward: ${levels.entry ? ((Math.abs(levels.takeProfit1 - levels.entry) / levels.entry) * 100).toFixed(2) : '—'}%`,
      } as HorizontalLine);
    }

    if (levels.takeProfit2 && action !== 'HOLD') {
      drawings.push({
        type: 'horizontal_line',
        id: uid(),
        price: levels.takeProfit2,
        label: `TP2 $${this.fmtPrice(levels.takeProfit2)}`,
        style: 'dashed',
        color: '#26a69a',
        thickness: 1,
        category: 'take_profit',
        annotation: `Take-profit 2 at $${this.fmtPrice(levels.takeProfit2)}`,
      } as HorizontalLine);
    }

    // ── Signal arrow on current candle ──────────────────────────────────────
    if (action !== 'HOLD') {
      const confPct = (confidence * 100).toFixed(0);
      const arrow: Arrow = {
        type: 'arrow',
        id: uid(),
        time: currentTime,
        price: action === 'BUY'
          ? currentPrice * 0.9985  // slightly below candle
          : currentPrice * 1.0015, // slightly above candle
        direction: action === 'BUY' ? 'up' : 'down',
        label: action,
        color: action === 'BUY' ? '#26a69a' : '#ef5350',
        size: confidence > 0.7 ? 'large' : 'medium',
        annotation: `${action} signal — Confidence: ${confPct}%. Entry: $${this.fmtPrice(levels.entry ?? currentPrice)}. SL: $${this.fmtPrice(levels.stopLoss ?? 0)}. TP1: $${this.fmtPrice(levels.takeProfit1 ?? 0)}.`,
      };
      drawings.push(arrow);
    }

    // ── Fibonacci levels ─────────────────────────────────────────────────────
    if (fib) {
      const fibSet: FibonacciSet = {
        type: 'fibonacci',
        id: uid(),
        highPrice: fib.highPrice,
        highTime: fib.highTime,
        lowPrice: fib.lowPrice,
        lowTime: fib.lowTime,
        levels: fib.levels,
        color: '#7c3aed',
        annotation: `Fibonacci retracement — High: $${this.fmtPrice(fib.highPrice)} / Low: $${this.fmtPrice(fib.lowPrice)}`,
      };
      drawings.push(fibSet);
    }

    // ── RSI overbought/oversold zones ────────────────────────────────────────
    const rsiIndicator = ta.indicators?.find((i) => i.name?.toLowerCase().includes('rsi'));
    if (rsiIndicator) {
      const rsiVal = typeof rsiIndicator.value === 'number' ? rsiIndicator.value : null;
      if (rsiVal !== null) {
        if (rsiVal > 65) {
          const zone: Zone = {
            type: 'zone',
            id: uid(),
            fromPrice: currentPrice * 1.02,
            toPrice: currentPrice * 1.05,
            color: 'rgba(239,83,80,0.08)',
            label: 'RSI Overbought Zone',
            category: 'overbought',
            annotation: `RSI at ${rsiVal.toFixed(1)} — approaching or in overbought territory (>70). Consider scaling back longs.`,
          };
          drawings.push(zone);
        } else if (rsiVal < 35) {
          const zone: Zone = {
            type: 'zone',
            id: uid(),
            fromPrice: currentPrice * 0.95,
            toPrice: currentPrice * 0.98,
            color: 'rgba(38,166,154,0.08)',
            label: 'RSI Oversold Zone',
            category: 'oversold',
            annotation: `RSI at ${rsiVal.toFixed(1)} — approaching or in oversold territory (<30). Potential bounce zone.`,
          };
          drawings.push(zone);
        }
      }
    }

    // ── Demand / supply zones from strong S/R ───────────────────────────────
    const strongSupport = levels.supports.find((s) => s.strength > 0.65);
    if (strongSupport) {
      const bandWidth = strongSupport.price * 0.005; // 0.5% band
      drawings.push({
        type: 'zone',
        id: uid(),
        fromPrice: strongSupport.price - bandWidth,
        toPrice: strongSupport.price + bandWidth,
        color: 'rgba(38,166,154,0.12)',
        label: 'Demand Zone',
        category: 'demand',
        annotation: `Strong demand zone at $${this.fmtPrice(strongSupport.price)} — ${strongSupport.touches} price touches, ${(strongSupport.strength * 100).toFixed(0)}% strength.`,
      } as Zone);
    }

    const strongResistance = levels.resistances.find((r) => r.strength > 0.65);
    if (strongResistance) {
      const bandWidth = strongResistance.price * 0.005;
      drawings.push({
        type: 'zone',
        id: uid(),
        fromPrice: strongResistance.price - bandWidth,
        toPrice: strongResistance.price + bandWidth,
        color: 'rgba(239,83,80,0.12)',
        label: 'Supply Zone',
        category: 'supply',
        annotation: `Strong supply zone at $${this.fmtPrice(strongResistance.price)} — ${strongResistance.touches} price touches, ${(strongResistance.strength * 100).toFixed(0)}% strength.`,
      } as Zone);
    }

    return {
      asset,
      timeframe,
      generatedAt: new Date().toISOString(),
      drawings,
    };
  }

  private fmtPrice(price: number): string {
    if (!price || isNaN(price)) return '—';
    if (price < 0.01) return price.toFixed(6);
    if (price < 10) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
}
