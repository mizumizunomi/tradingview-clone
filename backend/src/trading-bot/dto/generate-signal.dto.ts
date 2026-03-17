import { IsString, IsEnum, IsOptional, IsIn } from 'class-validator';

const ASSET_CLASSES = ['CRYPTO', 'FOREX', 'STOCK', 'COMMODITY'] as const;
type AssetClass = typeof ASSET_CLASSES[number];

export class GenerateSignalDto {
  @IsString()
  asset: string;

  @IsEnum(ASSET_CLASSES)
  assetClass: AssetClass;

  @IsOptional()
  @IsIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
  timeframe?: string;

  @IsOptional()
  @IsString()
  strategy?: string;
}
