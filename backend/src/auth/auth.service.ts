import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

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
        wallet: {
          create: {
            balance: 10000,
            equity: 10000,
            margin: 0,
            freeMargin: 10000,
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
}
