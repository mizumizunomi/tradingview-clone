export interface MultiTimeframeAnalysis {
  asset: string;
  timeframes: Record<string, {
    trend: string;
    compositeScore: number;
    keyLevels: { support: number[]; resistance: number[] };
  }>;
}

export interface CorrelationData {
  asset: string;
  correlatedAssets: Array<{
    symbol: string;
    correlation: number; // -1 to 1
    period: string;
  }>;
}

export interface ResearchReport {
  asset: string;
  assetClass: string;
  generatedAt: Date;
  priceActionSummary: MultiTimeframeAnalysis;
  technicalSummary: string;
  fundamentalSummary: string;
  correlations: CorrelationData;
  overallVerdict: string;
  confidence: number;
  suggestedEntry?: number;
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
  riskRewardRatio?: number;
  dataSources: string[];
  unavailableSources: string[];
}
