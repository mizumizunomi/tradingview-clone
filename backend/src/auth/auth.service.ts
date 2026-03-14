import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const PLAN_BALANCES: Record<string, number> = {
  silver: 500,
  gold: 50000,
  platinum: 1000000,
};

const VALID_PLANS = ['silver', 'gold', 'platinum'];

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
        plan: 'silver',
        wallet: {
          create: {
            balance: PLAN_BALANCES.silver,
            equity: PLAN_BALANCES.silver,
            margin: 0,
            freeMargin: PLAN_BALANCES.silver,
            marginLevel: 0,
          },
        },
      },
      include: { wallet: true },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { wallet: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
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
      include: { wallet: true },
    });

    // Update wallet balance to the plan's starting balance (only if upgrading)
    const newBalance = PLAN_BALANCES[plan];
    const wallet = user.wallet;
    if (wallet && wallet.balance < newBalance) {
      await this.prisma.wallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          equity: newBalance,
          freeMargin: newBalance - wallet.margin,
        },
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; bio?: string; avatar?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { wallet: true },
    });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
