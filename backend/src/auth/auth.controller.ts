import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GoogleTokenDto } from './dto/google-token.dto';
import type { AuthenticatedUser } from './interfaces/auth.interfaces';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const { accessToken, user } = this.authService.generateTokens(req.user);
    const redirectUrl = `wellvantage://auth/callback?token=${accessToken}&userId=${user.id}`;
    res.redirect(redirectUrl);
  }

  @Post('google/token')
  async googleTokenExchange(@Body() dto: GoogleTokenDto) {
    const user = await this.authService.validateGoogleIdToken(dto.idToken);
    return this.authService.generateTokens(user);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUserById(user.id);
  }
}
