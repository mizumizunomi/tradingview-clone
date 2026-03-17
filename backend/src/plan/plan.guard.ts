import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanService } from './plan.service';
import { TierName } from './constants/tier-config';

export const REQUIRED_TIER_KEY = 'requiredTier';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector, private planService: PlanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.get<TierName>(REQUIRED_TIER_KEY, context.getHandler());
    if (!requiredTier) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Authentication required');

    const userTier = await this.planService.getUserTier(userId);
    const tierOrder: TierName[] = ['NONE', 'DEFAULT', 'SILVER', 'GOLD', 'PLATINUM'];
    const userIndex = tierOrder.indexOf(userTier);
    const reqIndex = tierOrder.indexOf(requiredTier);

    if (userIndex < reqIndex) {
      const tierConfig = this.planService.getTierConfig(requiredTier);
      throw new ForbiddenException(
        `This feature requires ${tierConfig.label} plan. Please upgrade your account.`
      );
    }
    return true;
  }
}
