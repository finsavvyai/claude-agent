import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { SecurityService } from './services/security.service';
import { MfaService } from './services/mfa.service';
import { OAuthService } from './services/oauth.service';
import { VerifyTotpDto, VerifyWebAuthnDto } from './dto/mfa.dto';

interface MfaVerificationDto {
  method: 'totp' | 'webauthn' | 'backup';
  code?: string;
  verifyDto?: VerifyWebAuthnDto;
  challengeId?: string;
}

@Injectable()
export class AuthService {
  private readonly prisma: PrismaClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly securityService: SecurityService,
    private readonly mfaService: MfaService,
    private readonly oauthService: OAuthService,
  ) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Check if account is locked
    if (this.securityService.isAccountLocked(user)) {
      throw new UnauthorizedException('Account is temporarily locked due to multiple failed login attempts');
    }

    const isPasswordValid = await this.securityService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent?: string, mfaVerification?: MfaVerificationDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      // Handle failed login for security tracking
      await this.securityService.handleFailedLogin(loginDto.email, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!mfaVerification) {
        return {
          requiresMfa: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        } as any;
      }

      const mfaValid = await this.mfaService.verifyMfaForLogin(
        user,
        mfaVerification.method,
        mfaVerification.code,
        mfaVerification.verifyDto,
        mfaVerification.challengeId,
      );

      if (!mfaValid) {
        await this.securityService.handleFailedLogin(user.email, ipAddress, userAgent);
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Handle successful login
    await this.securityService.handleSuccessfulLogin(user, ipAddress, userAgent);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.securityService.validatePassword(registerDto.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Create new user
    const hashedPassword = await this.securityService.hashPassword(registerDto.password);
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        name: registerDto.name,
        password: hashedPassword,
        isActive: true,
        emailVerified: false,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // In a real implementation, you would invalidate the token
    // For now, just return a success message
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.securityService.changePassword(user, currentPassword, newPassword);
    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account with that email exists, a password reset link has been sent' };
    }

    const token = await this.securityService.generatePasswordResetToken(user);

    // In a real implementation, send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, token);

    console.log(`Password reset token for ${user.email}: ${token}`);

    return { message: 'If an account with that email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    await this.securityService.resetPassword(token, newPassword);
    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    await this.securityService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  async resendEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const token = await this.securityService.generateEmailVerificationToken(user);

    // In a real implementation, send verification email
    // await this.emailService.sendEmailVerification(user.email, token);

    console.log(`Email verification token for ${user.email}: ${token}`);

    return { message: 'Verification email sent' };
  }

  // OAuth authentication methods
  async authenticateWithGithub(code: string, redirectUri: string): Promise<AuthResponseDto> {
    return this.oauthService.authenticateWithGithub(code, redirectUri);
  }

  async authenticateWithGoogle(code: string, redirectUri: string): Promise<AuthResponseDto> {
    return this.oauthService.authenticateWithGoogle(code, redirectUri);
  }

  async authenticateWithMicrosoft(code: string, redirectUri: string): Promise<AuthResponseDto> {
    return this.oauthService.authenticateWithMicrosoft(code, redirectUri);
  }

  // OAuth URL generation
  getGithubAuthUrl(redirectUri: string, state?: string): string {
    return this.oauthService.getGithubAuthUrl(redirectUri, state);
  }

  getGoogleAuthUrl(redirectUri: string, state?: string): string {
    return this.oauthService.getGoogleAuthUrl(redirectUri, state);
  }

  getMicrosoftAuthUrl(redirectUri: string, state?: string): string {
    return this.oauthService.getMicrosoftAuthUrl(redirectUri, state);
  }

  // MFA methods
  async generateMfaSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.mfaService.generateTotpSecret(user);
  }

  async enableMfa(userId: string, enableMfaDto: any): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.mfaService.enableTotpMfa(user, enableMfaDto);
  }

  async verifyMfa(userId: string, verifyTotpDto: VerifyTotpDto): Promise<{ valid: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const valid = this.mfaService.verifyTotpCode(user.mfaSecret!, verifyTotpDto.code);
    return { valid };
  }

  async disableMfa(userId: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.mfaService.disableMfa(user, password);
  }

  async getMfaStatus(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.mfaService.getMfaStatus(user);
  }

  async generateWebAuthnChallenge(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.mfaService.generateWebAuthnChallenge(user);
  }

  async getSecuritySettings(userId: string): Promise<any> {
    return this.securityService.getSecuritySettings(userId);
  }

  async getPasswordStrength(password: string): Promise<any> {
    return this.securityService.getPasswordStrength(password);
  }

  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
