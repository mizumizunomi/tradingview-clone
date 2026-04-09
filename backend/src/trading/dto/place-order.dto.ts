import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, IsInt } from 'class-validator';

export enum OrderSideDto {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderTypeDto {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export class PlaceOrderDto {
  @IsString()
  assetId: string;

  @IsEnum(OrderSideDto)
  side: OrderSideDto;

  @IsNumber()
  @Min(0.001, { message: 'Minimum quantity is 0.001' })
  @Max(10000, { message: 'Maximum quantity is 10,000' })
  quantity: number;

  @IsOptional()
  @IsEnum(OrderTypeDto)
  type?: OrderTypeDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  leverage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  takeProfit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limitPrice?: number;
}
