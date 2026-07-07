import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * KYC submission payload. Document fields are currently URL strings (the upload pipeline is a
 * stub — no real file storage yet), so they are validated as non-empty strings here.
 */
export class SubmitKycDto {
  @IsString() @MinLength(2) @MaxLength(200)
  fullName: string;

  @IsString() @MinLength(4) @MaxLength(20)
  dateOfBirth: string;

  @IsString() @MinLength(2) @MaxLength(100)
  country: string;

  @IsString() @MinLength(3) @MaxLength(500)
  address: string;

  @IsString() @MaxLength(50)
  documentType: string;

  @IsString() @MaxLength(1000)
  documentFront: string;

  @IsOptional() @IsString() @MaxLength(1000)
  documentBack?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  selfie?: string;
}
