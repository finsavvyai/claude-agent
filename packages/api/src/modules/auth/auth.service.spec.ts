import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

import { AuthService } from './auth.service';
import { SecurityService } from './services/security.service';
import { MfaService } from './services/mfa.service';
import { OAuthService } from './services/oauth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

describe('AuthService', () => {
  let service: AuthService;
  let securityService: SecurityService;
  let mfaService: MfaService;
  let oauthService: OAuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: 'USER',
    isActive: true,
    mfaEnabled: false,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    const mockSecurityService = {
      validateUser: jest.fn(),
      handleFailedLogin: jest.fn(),
      handleSuccessfulLogin: jest.fn(),
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
      isAccountLocked: jest.fn(),
      validatePassword: jest.fn(),
      changePassword: jest.fn(),
      generatePasswordResetToken: jest.fn(),
      resetPassword: jest.fn(),
      generateEmailVerificationToken: jest.fn(),
      verifyEmail: jest.fn(),
      getSecuritySettings: jest.fn(),
      getPasswordStrength: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const mockMfaService = {
      generateTotpSecret: jest.fn(),
      verifyTotpCode: jest.fn(),
      enableTotpMfa: jest.fn(),
      verifyMfaForLogin: jest.fn(),
      disableMfa: jest.fn(),
      getMfaStatus: jest.fn(),
      generateWebAuthnChallenge: jest.fn(),
      verifyWebAuthn: jest.fn(),
      cleanupExpiredChallenges: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const mockOAuthService = {
      getGithubAuthUrl: jest.fn(),
      getGoogleAuthUrl: jest.fn(),
      getMicrosoftAuthUrl: jest.fn(),
      authenticateWithGithub: jest.fn(),
      authenticateWithGoogle: jest.fn(),
      authenticateWithMicrosoft: jest.fn(),
      linkOAuthAccount: jest.fn(),
      unlinkOAuthAccount: jest.fn(),
      getLinkedOAuthAccounts: jest.fn(),
      refreshOAuthTokens: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'database.url': 'postgresql://test',
          'jwt.secret': 'test-secret',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.expiresIn': '1h',
          'jwt.refreshExpiresIn': '7d',
          'app.name': 'Test App',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        AuthService,
        {
          provide: SecurityService,
          useValue: mockSecurityService,
        },
        {
          provide: MfaService,
          useValue: mockMfaService,
        },
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    securityService = module.get<SecurityService>(SecurityService);
    mfaService = module.get<MfaService>(MfaService);
    oauthService = module.get<OAuthService>(OAuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return tokens when credentials are valid', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      jest.spyOn(service, 'validateUser' as any).mockResolvedValue(mockUser);
      jest.spyOn(mfaService, 'verifyMfaForLogin').mockResolvedValue(true);
      jest.spyOn(securityService, 'isAccountLocked').mockReturnValue(false);
      jest.spyOn(service, 'generateTokens' as any).mockResolvedValue(mockTokens);

      const result = await service.login(loginDto, '127.0.0.1');

      expect(result).toEqual({
        ...mockTokens,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
    });

    it('should handle failed login', async () => {
      jest.spyOn(service, 'validateUser' as any).mockResolvedValue(null);

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow('Invalid credentials');
      expect(securityService.handleFailedLogin).toHaveBeenCalledWith(
        loginDto.email,
        '127.0.0.1',
        undefined,
      );
    });

    it('should handle locked account', async () => {
      jest.spyOn(securityService, 'isAccountLocked').mockReturnValue(true);

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        'Account is temporarily locked due to multiple failed login attempts',
      );
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'StrongPassword123!',
    };

    it('should register a new user successfully', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      jest.spyOn(securityService, 'validatePassword').mockReturnValue({
        isValid: true,
        errors: [],
      });
      jest.spyOn(securityService, 'hashPassword').mockResolvedValue('hashed-password');
      jest.spyOn(service, 'generateTokens' as any).mockResolvedValue(mockTokens);

      // Mock the Prisma operations
      jest.spyOn(service['prisma'].user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(service['prisma'].user, 'create').mockResolvedValue(mockUser as any);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        ...mockTokens,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
    });

    it('should reject weak passwords', async () => {
      jest.spyOn(securityService, 'validatePassword').mockReturnValue({
        isValid: false,
        errors: ['Password is too weak'],
      });

      await expect(service.register(registerDto)).rejects.toThrow(['Password is too weak']);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      };

      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);
      jest.spyOn(service['prisma'].user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(service, 'generateTokens' as any).mockResolvedValue(mockTokens);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toEqual({
        ...mockTokens,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
    });

    it('should reject invalid refresh token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('MFA operations', () => {
    it('should generate MFA secret', async () => {
      const mockMfaSecret = {
        secret: 'secret-key',
        qrCodeUrl: 'https://chart.googleapis.com/chart',
      };

      jest.spyOn(mfaService, 'generateTotpSecret').mockResolvedValue(mockMfaSecret);
      jest.spyOn(service['prisma'].user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.generateMfaSecret('1');

      expect(result).toEqual(mockMfaSecret);
    });

    it('should verify MFA code', async () => {
      const verifyTotpDto = { code: '123456' };

      jest.spyOn(mfaService, 'verifyTotpCode').mockReturnValue(true);
      jest.spyOn(service['prisma'].user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.verifyMfa('1', verifyTotpDto);

      expect(result).toEqual({ valid: true });
    });
  });

  describe('Password operations', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
      };

      jest.spyOn(service['prisma'].user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(securityService, 'changePassword').mockResolvedValue(undefined);

      const result = await service.changePassword('1', 'oldPassword', 'NewPassword123!');

      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should analyze password strength', async () => {
      const password = 'StrongPassword123!';
      const mockStrength = {
        score: 4,
        feedback: [],
        color: 'green',
      };

      jest.spyOn(securityService, 'getPasswordStrength').mockReturnValue(mockStrength);

      const result = await service.getPasswordStrength(password);

      expect(result).toEqual(mockStrength);
    });
  });

  describe('OAuth operations', () => {
    it('should generate GitHub OAuth URL', async () => {
      const mockUrl = 'https://github.com/login/oauth/authorize?params';
      jest.spyOn(oauthService, 'getGithubAuthUrl').mockReturnValue(mockUrl);

      const result = service.getGithubAuthUrl('http://localhost:3000/callback', 'state');

      expect(result).toEqual({ url: mockUrl });
    });

    it('should authenticate with GitHub', async () => {
      const mockAuthResponse = {
        accessToken: 'github-access-token',
        refreshToken: 'github-refresh-token',
        user: mockUser,
      };

      jest.spyOn(oauthService, 'authenticateWithGithub').mockResolvedValue(mockAuthResponse);

      const result = await service.authenticateWithGithub('code', 'http://localhost:3000/callback');

      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('Security operations', () => {
    it('should get security settings', async () => {
      const mockSecuritySettings = {
        emailVerified: true,
        mfaEnabled: false,
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        passwordExpired: false,
        passwordLastChanged: new Date(),
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90,
          preventReuse: 5,
        },
      };

      jest.spyOn(securityService, 'getSecuritySettings').mockResolvedValue(mockSecuritySettings);

      const result = await service.getSecuritySettings('1');

      expect(result).toEqual(mockSecuritySettings);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
