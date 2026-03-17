import { IsString, IsEnum, IsObject, IsOptional, IsBoolean } from 'class-validator';

const ASSET_CLASSES = ['CRYPTO', 'FOREX', 'STOCK', 'COMMODITY'] as const;
type AssetClass = typeof ASSET_CLASSES[number];

export class CreateStrategyDto {
  @IsString()
  name: string;

  @IsEnum(ASSET_CLASSES)
  assetClass: AssetClass;

  @IsObject()
  indicators: Record<string, unknown>;

  @IsObject()
  rules: Record<string, unknown>;

  @IsObject()
  riskParams: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStrategyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  indicators?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  riskParams?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
