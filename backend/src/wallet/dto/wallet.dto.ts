import { IsEnum, IsNumber, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

/**
 * Validated deposit/withdraw payloads. Without these, an invalid `method` (e.g. "CARD" instead
 * of the PaymentMethod enum) reached Prisma and produced an opaque HTTP 500; now class-validator
 * rejects it with a clean 400 before it hits the service.
 */
export class DepositDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod, {
    message: `method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  method: PaymentMethod;
}

export class WithdrawDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod, {
    message: `method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  method: PaymentMethod;
}
