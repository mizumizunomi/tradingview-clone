import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private kycService: KycService) {}

  @Get('status')
  getStatus(@Request() req: any) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('submit')
  submit(@Request() req: any, @Body() dto: {
    fullName: string;
    dateOfBirth: string;
    country: string;
    address: string;
    documentType: string;
    documentFront: string;
    documentBack?: string;
    selfie?: string;
  }) {
    return this.kycService.submit(req.user.id, dto);
  }
}
