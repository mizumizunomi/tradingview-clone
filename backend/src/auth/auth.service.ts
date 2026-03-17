import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

// Tier deposit thresholds for auto-upgrade
export const TIER_DEPOSIT_THRESHOLDS: Record<string, number> = {
  DEFAULT: 250,
  SILVER: 2500,
  GOLD: 10000,
  PLATINUM: 50000,
};

// Map old plan strings to new tier names (backward compat)
const PLAN_TO_TIER: Record<string, string> = {
  none: 'NONE',
  default: 'DEFAULT',
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
};

const VALID_PLANS = ['none', 'default', 'silver', 'gold', 'platinum'];

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (exists) throw new ConflictException('Email or username already taken');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        plan: 'none',
        wallet: {
          create: {
            balance: 0,
            equity: 0,
            margin: 0,
            freeMargin: 0,
            marginLevel: 0,
          },
        },
        subscription: {
          create: {
            tier: 'NONE',
            totalDeposited: 0,
            monthlyFee: 0,
          },
        },
      },
      include: { wallet: true, subscription: true },
    });

    const { password: _, ...userWithoutPassword } = user;
    // Return user only — frontend will redirect to login
    return { user: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { wallet: true, subscription: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException('Your account has been suspended');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, subscription: true },
    });
    if (!user) throw new UnauthorizedException();
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updatePlan(userId: string, plan: string) {
    if (!VALID_PLANS.includes(plan)) {
      throw new BadRequestException(`Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}`);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { plan },
      include: { wallet: true, subscription: true },
    });

    // Sync UserSubscription tier
    const newTier = PLAN_TO_TIER[plan] as any;
    if (user.subscription) {
      await this.prisma.userSubscription.update({
        where: { userId },
        data: { tier: newTier },
      });
    } else {
      await this.prisma.userSubscription.create({
        data: { userId, tier: newTier },
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; bio?: string; avatar?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { wallet: true, subscription: true },
    });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
