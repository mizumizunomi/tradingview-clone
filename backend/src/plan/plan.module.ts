import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';

@Module({
  imports: [PrismaModule],
  providers: [PlanService],
  controllers: [PlanController],
  exports: [PlanService],
})
export class PlanModule {}
