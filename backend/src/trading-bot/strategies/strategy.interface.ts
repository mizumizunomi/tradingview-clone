export type StrategyTier = 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type StrategyCategory = 'TREND' | 'REVERSAL' | 'BREAKOUT' | 'SCALPING' | 'COMPOSITE';

export interface IndicatorWeight {
  indicator: string;   // matches IndicatorSnapshot.name
  weight: number;      // multiplier applied to that indicator's score contribution
  required?: boolean;  // if true, this indicator must be non-neutral for entry
}

export interface StrategyRiskParams {
  atrMultiplierSL: number;     // ATR multiplier for stop loss placement
  atrMultiplierTP: number;     // ATR multiplier for take profit placement
  minRR: number;               // minimum reward-to-risk ratio enforced
  positionSizeFraction?: number; // fraction of free margin (overrides global default)
}

export interface StrategyDefinition {
  name: string;
  displayName: string;
  description: string;
  category: StrategyCategory;
  tier: StrategyTier;
  assetClasses: string[];
  bestTimeframes: string[];
  indicatorWeights: IndicatorWeight[];
  riskParams: StrategyRiskParams;
  entryLogic: string;
  exitLogic: string;
  signalThreshold?: number;        // override default 0.25
  requiresFundamental?: boolean;
  fundamentalWeight?: number;       // override asset-class FA weight
  tags: string[];
}
