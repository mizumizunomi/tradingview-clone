import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/kyc.dto';

type AuthReq = { user: { id: string } };

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private kycService: KycService) {}

  @Get('status')
  getStatus(@Request() req: AuthReq) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('submit')
  submit(@Request() req: AuthReq, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(req.user.id, dto);
  }
}
