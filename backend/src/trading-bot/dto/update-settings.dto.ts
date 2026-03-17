import { IsBoolean, IsEnum, IsInt, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';

const ASSET_CLASSES = ['CRYPTO', 'FOREX', 'STOCK', 'COMMODITY'] as const;
type AssetClass = typeof ASSET_CLASSES[number];

const RISK_LEVELS = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const;
type RiskLevel = typeof RISK_LEVELS[number];

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoTradeEnabled?: boolean;

  @IsOptional()
  @IsEnum(RISK_LEVELS)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxDailyTrades?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxDrawdownPercent?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ASSET_CLASSES, { each: true })
  enabledAssetClasses?: AssetClass[];

  @IsOptional()
  @IsBoolean()
  notifyOnSignal?: boolean;
}
