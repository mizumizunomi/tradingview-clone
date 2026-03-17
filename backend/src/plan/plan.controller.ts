import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PlanService } from './plan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TIER_CONFIG } from './constants/tier-config';

@Controller('plan')
export class PlanController {
  constructor(private planService: PlanService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getPlanInfo(@Request() req: { user: { id: string } }) {
    return this.planService.getUserPlanInfo(req.user.id);
  }

  @Get('tiers')
  getTiers() {
    return TIER_CONFIG;
  }
}
