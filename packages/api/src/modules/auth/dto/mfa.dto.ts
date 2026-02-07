import { IsString, IsBoolean, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({ description: 'TOTP secret for user' })
  @IsString()
  secret: string;

  @ApiProperty({ description: 'Backup codes for MFA recovery' })
  @IsArray()
  @IsString({ each: true })
  backupCodes: string[];
}

export class VerifyTotpDto {
  @ApiProperty({ description: 'TOTP code from authenticator app' })
  @IsString()
  code: string;
}

export class EnableWebAuthnDto {
  @ApiProperty({ description: 'WebAuthn credential ID' })
  @IsString()
  credentialId: string;

  @ApiProperty({ description: 'WebAuthn public key' })
  @IsString()
  publicKey: string;

  @ApiProperty({ description: 'WebAuthn signature counter' })
  @IsString()
  counter: string;
}

export class VerifyWebAuthnDto {
  @ApiProperty({ description: 'WebAuthn assertion response' })
  @IsString()
  credentialId: string;

  @ApiProperty({ description: 'Authentication signature' })
  @IsString()
  signature: string;

  @ApiProperty({ description: 'Client data JSON' })
  @IsString()
  clientDataJSON: string;

  @ApiProperty({ description: 'Authenticator data' })
  @IsString()
  authenticatorData: string;
}

export class MfaChallengeDto {
  @ApiProperty({ description: 'Challenge identifier' })
  @IsString()
  challengeId: string;

  @ApiProperty({ description: 'Challenge data for WebAuthn' })
  @IsOptional()
  @IsString()
  challenge?: string;

  @ApiProperty({ description: 'User information for WebAuthn' })
  @IsOptional()
  user?: {
    id: string;
    name: string;
    displayName: string;
  };

  @ApiProperty({ description: 'Relying party information' })
  @IsOptional()
  rp?: {
    name: string;
    id: string;
  };
}

export class MfaStatusDto {
  @ApiProperty({ description: 'Whether MFA is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'TOTP is configured' })
  @IsBoolean()
  totpEnabled: boolean;

  @ApiProperty({ description: 'WebAuthn is configured' })
  @IsBoolean()
  webauthnEnabled: boolean;

  @ApiProperty({ description: 'Number of backup codes available' })
  @IsString()
  backupCodesCount: number;

  @ApiProperty({ description: 'WebAuthn credential information' })
  @IsOptional()
  @IsArray()
  webauthnCredentials?: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}
