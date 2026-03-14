import { Body, Controller, Get, Post, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Patch('plan')
  @UseGuards(JwtAuthGuard)
  updatePlan(@Request() req: any, @Body() body: { plan: string }) {
    return this.authService.updatePlan(req.user.id, body.plan);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Request() req: any, @Body() body: { firstName?: string; lastName?: string; bio?: string; avatar?: string }) {
    return this.authService.updateProfile(req.user.id, body);
  }
}
