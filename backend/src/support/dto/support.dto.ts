import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { SupportPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @MinLength(3, { message: 'Subject must be at least 3 characters' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(5, { message: 'Message must be at least 5 characters' })
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsEnum(SupportPriority, {
    message: `priority must be one of: ${Object.values(SupportPriority).join(', ')}`,
  })
  priority?: SupportPriority;
}
