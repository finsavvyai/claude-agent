import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Request, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  VerifyTotpDto,
  EnableWebAuthnDto,
  VerifyWebAuthnDto,
  MfaStatusDto,
  EnableMfaDto
} from './dto/mfa.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any
  ): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any): Promise<{ message: string }> {
    return this.authService.logout(req.user.id);
  }

  // Password Management
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: {
      currentPassword: string;
      newPassword: string;
    }
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async requestPasswordReset(@Body('email') email: string): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body() resetPasswordDto: {
      token: string;
      newPassword: string;
    }
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  // Email Verification
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification token' })
  async verifyEmail(@Body('token') token: string): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  async resendVerification(@Request() req: any): Promise<{ message: string }> {
    return this.authService.resendEmailVerification(req.user.id);
  }

  // OAuth URLs
  @Get('oauth/github')
  @ApiOperation({ summary: 'Get GitHub OAuth URL' })
  @ApiResponse({ status: 200, description: 'GitHub OAuth URL generated' })
  getGithubAuthUrl(
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state?: string
  ): { url: string } {
    return { url: this.authService.getGithubAuthUrl(redirectUri, state) };
  }

  @Get('oauth/google')
  @ApiOperation({ summary: 'Get Google OAuth URL' })
  @ApiResponse({ status: 200, description: 'Google OAuth URL generated' })
  getGoogleAuthUrl(
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state?: string
  ): { url: string } {
    return { url: this.authService.getGoogleAuthUrl(redirectUri, state) };
  }

  @Get('oauth/microsoft')
  @ApiOperation({ summary: 'Get Microsoft OAuth URL' })
  @ApiResponse({ status: 200, description: 'Microsoft OAuth URL generated' })
  getMicrosoftAuthUrl(
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state?: string
  ): { url: string } {
    return { url: this.authService.getMicrosoftAuthUrl(redirectUri, state) };
  }

  // OAuth Callbacks
  @Post('oauth/github/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  @ApiResponse({ status: 200, description: 'GitHub authentication successful' })
  async githubCallback(
    @Body() callbackDto: { code: string; redirectUri: string }
  ): Promise<AuthResponseDto> {
    return this.authService.authenticateWithGithub(callbackDto.code, callbackDto.redirectUri);
  }

  @Post('oauth/google/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  async googleCallback(
    @Body() callbackDto: { code: string; redirectUri: string }
  ): Promise<AuthResponseDto> {
    return this.authService.authenticateWithGoogle(callbackDto.code, callbackDto.redirectUri);
  }

  @Post('oauth/microsoft/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  @ApiResponse({ status: 200, description: 'Microsoft authentication successful' })
  async microsoftCallback(
    @Body() callbackDto: { code: string; redirectUri: string }
  ): Promise<AuthResponseDto> {
    return this.authService.authenticateWithMicrosoft(callbackDto.code, callbackDto.redirectUri);
  }

  // MFA Endpoints
  @Post('mfa/generate-secret')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate MFA TOTP secret' })
  @ApiResponse({ status: 200, description: 'MFA secret generated' })
  async generateMfaSecret(@Request() req: any): Promise<{ secret: string; qrCodeUrl: string }> {
    return this.authService.generateMfaSecret(req.user.id);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  async enableMfa(
    @Request() req: any,
    @Body() enableMfaDto: EnableMfaDto
  ): Promise<MfaStatusDto> {
    return this.authService.enableMfa(req.user.id, enableMfaDto);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify MFA code' })
  @ApiResponse({ status: 200, description: 'MFA code verification result' })
  async verifyMfa(
    @Request() req: any,
    @Body() verifyTotpDto: VerifyTotpDto
  ): Promise<{ valid: boolean }> {
    return this.authService.verifyMfa(req.user.id, verifyTotpDto);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  async disableMfa(
    @Request() req: any,
    @Body() disableMfaDto: { password: string }
  ): Promise<MfaStatusDto> {
    return this.authService.disableMfa(req.user.id, disableMfaDto.password);
  }

  @Get('mfa/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved' })
  async getMfaStatus(@Request() req: any): Promise<MfaStatusDto> {
    return this.authService.getMfaStatus(req.user.id);
  }

  @Post('mfa/webauthn/challenge')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate WebAuthn challenge' })
  @ApiResponse({ status: 200, description: 'WebAuthn challenge generated' })
  async generateWebAuthnChallenge(@Request() req: any): Promise<any> {
    return this.authService.generateWebAuthnChallenge(req.user.id);
  }

  // Security Settings
  @Get('security/settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get security settings' })
  @ApiResponse({ status: 200, description: 'Security settings retrieved' })
  async getSecuritySettings(@Request() req: any): Promise<any> {
    return this.authService.getSecuritySettings(req.user.id);
  }

  @Post('security/password-strength')
  @ApiOperation({ summary: 'Check password strength' })
  @ApiResponse({ status: 200, description: 'Password strength analysis' })
  async getPasswordStrength(@Body('password') password: string): Promise<any> {
    return this.authService.getPasswordStrength(password);
  }
}
