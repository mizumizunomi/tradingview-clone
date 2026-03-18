// ── Chart Drawing Contract ──────────────────────────────────────────────────
// The backend sends ChartDrawingSet to the frontend.
// The frontend renders all elements on the chart canvas overlay.

export interface ChartDrawingSet {
  asset: string;
  timeframe: string;
  generatedAt: string; // ISO timestamp
  drawings: ChartDrawing[];
}

export type ChartDrawing =
  | HorizontalLine
  | TrendLine
  | Arrow
  | Zone
  | FibonacciSet
  | AnnotationMarker;

export interface HorizontalLine {
  type: 'horizontal_line';
  id: string;
  price: number;
  label: string;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness: number;
  category: 'support' | 'resistance' | 'stop_loss' | 'take_profit' | 'entry' | 'fibonacci';
  annotation?: string;
}

export interface TrendLine {
  type: 'trend_line';
  id: string;
  startTime: number; // unix seconds
  startPrice: number;
  endTime: number;   // unix seconds
  endPrice: number;
  label?: string;
  style: 'solid' | 'dashed';
  color: string;
  category: 'pattern' | 'trend' | 'channel';
  annotation?: string;
}

export interface Arrow {
  type: 'arrow';
  id: string;
  time: number;       // unix seconds — which candle
  price: number;
  direction: 'up' | 'down';
  label: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  annotation?: string;
}

export interface Zone {
  type: 'zone';
  id: string;
  fromPrice: number;
  toPrice: number;
  color: string;  // rgba with alpha e.g. "rgba(255,0,0,0.1)"
  label?: string;
  category: 'supply' | 'demand' | 'overbought' | 'oversold' | 'consolidation';
  annotation?: string;
}

export interface FibonacciSet {
  type: 'fibonacci';
  id: string;
  highPrice: number;
  highTime: number;
  lowPrice: number;
  lowTime: number;
  levels: { ratio: number; price: number; label: string }[];
  color: string;
  annotation?: string;
}

export interface AnnotationMarker {
  type: 'annotation';
  id: string;
  time: number;
  price: number;
  icon: 'info' | 'warning' | 'signal' | 'pattern' | 'news';
  text: string;
  detailedText: string;
}
