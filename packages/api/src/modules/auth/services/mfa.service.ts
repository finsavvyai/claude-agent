import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, User } from '@prisma/client';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { base64url } from 'rfc4648';

import {
  EnableMfaDto,
  VerifyTotpDto,
  EnableWebAuthnDto,
  VerifyWebAuthnDto,
  MfaChallengeDto,
  MfaStatusDto
} from '../dto/mfa.dto';

@Injectable()
export class MfaService {
  private readonly prisma: PrismaClient;
  private readonly challenges = new Map<string, any>();

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });
  }

  /**
   * Generate TOTP secret for user
   */
  async generateTotpSecret(user: User): Promise<{ secret: string; qrCodeUrl: string }> {
    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('app.name')} (${user.email})`,
      issuer: this.configService.get('app.name'),
      length: 32,
    });

    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `${this.configService.get('app.name')} (${user.email})`,
      issuer: this.configService.get('app.name'),
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTotpCode(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before and after
      time: Math.floor(Date.now() / 1000),
    });
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Enable MFA with TOTP
   */
  async enableTotpMfa(user: User, enableMfaDto: EnableMfaDto): Promise<MfaStatusDto> {
    // Verify the provided TOTP code is valid
    if (!this.verifyTotpCode(enableMfaDto.secret, enableMfaDto.backupCodes[0])) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Hash backup codes before storing
    const hashedBackupCodes = enableMfaDto.backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Update user with MFA settings
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: enableMfaDto.secret,
        backupCodes: hashedBackupCodes,
      },
    });

    return this.getMfaStatus(user);
  }

  /**
   * Enable WebAuthn MFA
   */
  async enableWebAuthnMfa(user: User, enableWebAuthnDto: EnableWebAuthnDto): Promise<MfaStatusDto> {
    const existingCredentials = user.webauthnCredentials || [];

    // Check if credential already exists
    if (existingCredentials.some((cred: any) => cred.id === enableWebAuthnDto.credentialId)) {
      throw new ConflictException('WebAuthn credential already exists');
    }

    const newCredential = {
      id: enableWebAuthnDto.credentialId,
      publicKey: enableWebAuthnDto.publicKey,
      counter: parseInt(enableWebAuthnDto.counter),
      name: `Security Key ${existingCredentials.length + 1}`,
      createdAt: new Date().toISOString(),
    };

    const updatedCredentials = [...existingCredentials, newCredential];

    // Update user with WebAuthn credentials
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        webauthnCredentials: updatedCredentials,
      },
    });

    return this.getMfaStatus(user);
  }

  /**
   * Generate WebAuthn challenge
   */
  generateWebAuthnChallenge(user: User): MfaChallengeDto {
    const challengeId = crypto.randomUUID();
    const challenge = base64url.stringify(crypto.randomBytes(32));

    this.challenges.set(challengeId, {
      challenge,
      userId: user.id,
      createdAt: new Date(),
    });

    return {
      challengeId,
      challenge,
      user: {
        id: user.id,
        name: user.email,
        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      },
      rp: {
        name: this.configService.get('app.name'),
        id: this.configService.get('app.url')?.replace(/^https?:\/\//, '') || 'localhost',
      },
    };
  }

  /**
   * Verify WebAuthn assertion
   */
  async verifyWebAuthn(user: User, verifyDto: VerifyWebAuthnDto, challengeId: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.userId !== user.id) {
      throw new BadRequestException('Invalid or expired challenge');
    }

    const credentials = user.webauthnCredentials || [];
    const credential = credentials.find((cred: any) => cred.id === verifyDto.credentialId);

    if (!credential) {
      throw new UnauthorizedException('WebAuthn credential not found');
    }

    // In a real implementation, you would verify the assertion signature here
    // For now, we'll simulate the verification process
    const isValid = this.simulateWebAuthnVerification(verifyDto, challenge.challenge);

    // Clean up challenge
    this.challenges.delete(challengeId);

    return isValid;
  }

  /**
   * Simulate WebAuthn verification (in production, use proper WebAuthn libraries)
   */
  private simulateWebAuthnVerification(verifyDto: VerifyWebAuthnDto, challenge: string): boolean {
    // This is a simplified simulation
    // In production, use @simplewebauthn libraries or similar
    try {
      const clientData = JSON.parse(base64url.parse(verifyDto.clientDataJSON).toString());
      return clientData.challenge === challenge;
    } catch {
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(user: User, code: string): Promise<boolean> {
    const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
    const backupCodes = user.backupCodes || [];

    const codeIndex = backupCodes.indexOf(hashedCode);
    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    backupCodes.splice(codeIndex, 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { backupCodes },
    });

    return true;
  }

  /**
   * Disable MFA
   */
  async disableMfa(user: User, password: string): Promise<MfaStatusDto> {
    // Verify password before disabling MFA
    const authService = this.constructor.prototype.constructor.dependencies?.[0];
    if (!authService || !(await authService.validateUser(user.email, password))) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: [],
        webauthnCredentials: [],
      },
    });

    return this.getMfaStatus(user);
  }

  /**
   * Get MFA status for user
   */
  async getMfaStatus(user: User): Promise<MfaStatusDto> {
    const backupCodes = user.backupCodes || [];
    const webauthnCredentials = user.webauthnCredentials || [];

    return {
      enabled: user.mfaEnabled,
      totpEnabled: !!user.mfaSecret,
      webauthnEnabled: webauthnCredentials.length > 0,
      backupCodesCount: backupCodes.length,
      webauthnCredentials: webauthnCredentials.map((cred: any) => ({
        id: cred.id,
        name: cred.name,
        createdAt: cred.createdAt,
      })),
    };
  }

  /**
   * Verify MFA for login
   */
  async verifyMfaForLogin(user: User, method: 'totp' | 'webauthn' | 'backup', code?: string, verifyDto?: VerifyWebAuthnDto, challengeId?: string): Promise<boolean> {
    switch (method) {
      case 'totp':
        if (!user.mfaSecret || !code) {
          return false;
        }
        return this.verifyTotpCode(user.mfaSecret, code);

      case 'webauthn':
        if (!verifyDto || !challengeId) {
          return false;
        }
        return this.verifyWebAuthn(user, verifyDto, challengeId);

      case 'backup':
        if (!code) {
          return false;
        }
        return this.verifyBackupCode(user, code);

      default:
        return false;
    }
  }

  /**
   * Clean up expired challenges
   */
  cleanupExpiredChallenges(): void {
    const now = new Date();
    const expiredTime = 5 * 60 * 1000; // 5 minutes

    for (const [id, challenge] of this.challenges.entries()) {
      if (now.getTime() - challenge.createdAt.getTime() > expiredTime) {
        this.challenges.delete(id);
      }
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
