import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { z } from 'zod';

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords to prevent reuse
}

interface SecurityEvent {
  userId: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'PASSWORD_CHANGE' | 'MFA_ENABLED' | 'MFA_DISABLED' | 'ACCOUNT_LOCKED' | 'ACCOUNT_UNLOCKED';
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: any;
}

@Injectable()
export class SecurityService {
  private readonly prisma: PrismaClient;
  private readonly passwordPolicy: PasswordPolicy;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });

    this.passwordPolicy = {
      minLength: this.configService.get('security.password.minLength', 12),
      requireUppercase: this.configService.get('security.password.requireUppercase', true),
      requireLowercase: this.configService.get('security.password.requireLowercase', true),
      requireNumbers: this.configService.get('security.password.requireNumbers', true),
      requireSpecialChars: this.configService.get('security.password.requireSpecialChars', true),
      maxAge: this.configService.get('security.password.maxAge', 90), // days
      preventReuse: this.configService.get('security.password.preventReuse', 5),
    };
  }

  /**
   * Validate password against security policy
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.passwordPolicy.minLength) {
      errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters long`);
    }

    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
      errors.push('Password contains common weak patterns');
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password has sequential characters
   */
  private hasSequentialChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);

      // Check for ascending sequence
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }

      // Check for descending sequence
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get('security.password.saltRounds', 12);
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(user: User): boolean {
    return user.lockedUntil && user.lockedUntil > new Date();
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(email: string, ipAddress: string, userAgent?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return; // Don't reveal if user exists
    }

    // Increment failed login attempts
    const maxAttempts = this.configService.get('security.maxLoginAttempts', 5);
    const lockoutDuration = this.configService.get('security.lockoutDuration', 30) * 60 * 1000; // minutes to ms

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: user.failedLoginAttempts + 1,
        lockedUntil: user.failedLoginAttempts + 1 >= maxAttempts
          ? new Date(Date.now() + lockoutDuration)
          : user.lockedUntil,
      },
    });

    // Log security event
    await this.logSecurityEvent({
      userId: user.id,
      type: 'LOGIN_FAILURE',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      metadata: {
        attemptNumber: updatedUser.failedLoginAttempts,
        accountLocked: this.isAccountLocked(updatedUser),
      },
    });

    // If account is now locked, send notification
    if (this.isAccountLocked(updatedUser)) {
      await this.logSecurityEvent({
        userId: user.id,
        type: 'ACCOUNT_LOCKED',
        ipAddress,
        userAgent,
        timestamp: new Date(),
        metadata: {
          lockoutDuration,
          reason: 'Too many failed login attempts',
        },
      });
    }
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(user: User, ipAddress: string, userAgent?: string): Promise<void> {
    // Reset failed login attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Log security event
    await this.logSecurityEvent({
      userId: user.id,
      type: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Change user password
   */
  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
    // Verify current password
    if (!await this.verifyPassword(currentPassword, user.password)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Check if new password is same as current
    if (await this.verifyPassword(newPassword, user.password)) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update password
    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Log security event
    await this.logSecurityEvent({
      userId: user.id,
      type: 'PASSWORD_CHANGE',
      ipAddress: '127.0.0.1', // Should be passed in from request
      timestamp: new Date(),
    });
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(user: User): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });

    return token;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Hash and update password
    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });

    // Log security event
    await this.logSecurityEvent({
      userId: user.id,
      type: 'PASSWORD_CHANGE',
      ipAddress: '127.0.0.1', // Should be passed in from request
      timestamp: new Date(),
      metadata: {
        resetViaToken: true,
      },
    });
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(user: User): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        updatedAt: new Date(),
      },
    });

    return token;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerified: false,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Check if password needs to be changed (expired)
   */
  isPasswordExpired(user: User): boolean {
    if (!user.updatedAt) {
      return false;
    }

    const maxAge = this.passwordPolicy.maxAge * 24 * 60 * 60 * 1000; // days to ms
    return Date.now() - user.updatedAt.getTime() > maxAge;
  }

  /**
   * Get security settings for user
   */
  async getSecuritySettings(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        mfaEnabled: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      failedLoginAttempts: user.failedLoginAttempts,
      isLocked: this.isAccountLocked(user),
      lockedUntil: user.lockedUntil,
      passwordExpired: this.isPasswordExpired(user),
      passwordLastChanged: user.updatedAt,
      passwordPolicy: this.passwordPolicy,
    };
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // In a real implementation, this would log to a secure audit system
    // For now, we'll just log to console or create audit log entries
    console.log(`Security Event: ${event.type} for user ${event.userId} at ${event.timestamp}`, {
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
    });

    // You could also create an AuditLog entry in the database
    // await this.prisma.auditLog.create({
    //   data: {
    //     userId: event.userId,
    //     action: event.type,
    //     details: {
    //       ipAddress: event.ipAddress,
    //       userAgent: event.userAgent,
    //       metadata: event.metadata,
    //     },
    //     timestamp: event.timestamp,
    //   },
    // });
  }

  /**
   * Get recent security events for user
   */
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    // In a real implementation, this would query the audit log system
    // For now, return empty array
    return [];
  }

  /**
   * Check if IP address is suspicious
   */
  isSuspiciousIp(ipAddress: string): boolean {
    // Basic IP validation and suspicious pattern checking
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return false;
    }

    // Check for known suspicious patterns
    const suspiciousPatterns = [
      /^10\./,      // Private network
      /^192\.168\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ipAddress));
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get password strength indicator
   */
  getPasswordStrength(password: string): {
    score: number; // 0-4
    feedback: string[];
    color: string;
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length
    if (password.length >= 12) score += 1;
    else feedback.push('Use at least 12 characters');

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    // Common patterns
    if (this.hasSequentialChars(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid sequential characters');
    }

    const colors = ['red', 'orange', 'yellow', 'light-green', 'green'];

    return {
      score: Math.min(4, score),
      feedback,
      color: colors[Math.min(4, score)],
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
