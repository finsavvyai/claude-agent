import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, User, OAuthProvider } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';

import { AuthService } from '../auth.service';

interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  username?: string;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

@Injectable()
export class OAuthService {
  private readonly prisma: PrismaClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });
  }

  /**
   * Get OAuth authorization URL for GitHub
   */
  getGithubAuthUrl(redirectUri: string, state?: string): string {
    const clientId = this.configService.get('oauth.github.clientId');
    const scopes = 'user:email';
    const generatedState = state || crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: generatedState,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Get OAuth authorization URL for Google
   */
  getGoogleAuthUrl(redirectUri: string, state?: string): string {
    const clientId = this.configService.get('oauth.google.clientId');
    const scopes = ['openid', 'email', 'profile'].join(' ');
    const generatedState = state || crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state: generatedState,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Get OAuth authorization URL for Microsoft
   */
  getMicrosoftAuthUrl(redirectUri: string, state?: string): string {
    const clientId = this.configService.get('oauth.microsoft.clientId');
    const scopes = ['openid', 'email', 'profile'].join(' ');
    const generatedState = state || crypto.randomUUID();
    const tenant = this.configService.get('oauth.microsoft.tenant', 'common');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state: generatedState,
      response_mode: 'query',
    });

    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Authenticate with GitHub OAuth
   */
  async authenticateWithGithub(code: string, redirectUri: string): Promise<any> {
    // Exchange code for tokens
    const tokens = await this.exchangeGithubCode(code, redirectUri);

    // Get user profile
    const profile = await this.getGithubProfile(tokens.access_token);

    // Find or create user
    return await this.findOrCreateUser(OAuthProvider.GITHUB, profile, tokens);
  }

  /**
   * Authenticate with Google OAuth
   */
  async authenticateWithGoogle(code: string, redirectUri: string): Promise<any> {
    // Exchange code for tokens
    const tokens = await this.exchangeGoogleCode(code, redirectUri);

    // Get user profile
    const profile = await this.getGoogleProfile(tokens.access_token);

    // Find or create user
    return await this.findOrCreateUser(OAuthProvider.GOOGLE, profile, tokens);
  }

  /**
   * Authenticate with Microsoft OAuth
   */
  async authenticateWithMicrosoft(code: string, redirectUri: string): Promise<any> {
    // Exchange code for tokens
    const tokens = await this.exchangeMicrosoftCode(code, redirectUri);

    // Get user profile
    const profile = await this.getMicrosoftProfile(tokens.access_token);

    // Find or create user
    return await this.findOrCreateUser(OAuthProvider.MICROSOFT, profile, tokens);
  }

  /**
   * Exchange GitHub authorization code for tokens
   */
  private async exchangeGithubCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientId = this.configService.get('oauth.github.clientId');
    const clientSecret = this.configService.get('oauth.github.clientSecret');

    try {
      const response = await lastValueFrom(
        this.httpService.post('https://github.com/login/oauth/access_token', {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }, {
          headers: {
            'Accept': 'application/json',
          },
        })
      );

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to exchange GitHub authorization code');
    }
  }

  /**
   * Exchange Google authorization code for tokens
   */
  private async exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientId = this.configService.get('oauth.google.clientId');
    const clientSecret = this.configService.get('oauth.google.clientSecret');

    try {
      const response = await lastValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        })
      );

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to exchange Google authorization code');
    }
  }

  /**
   * Exchange Microsoft authorization code for tokens
   */
  private async exchangeMicrosoftCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientId = this.configService.get('oauth.microsoft.clientId');
    const clientSecret = this.configService.get('oauth.microsoft.clientSecret');
    const tenant = this.configService.get('oauth.microsoft.tenant', 'common');

    try {
      const response = await lastValueFrom(
        this.httpService.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to exchange Microsoft authorization code');
    }
  }

  /**
   * Get GitHub user profile
   */
  private async getGithubProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const [userResponse, emailsResponse] = await Promise.all([
        lastValueFrom(
          this.httpService.get('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${accessToken}`,
              'User-Agent': this.configService.get('app.name', 'Claude Agent Platform'),
            },
          })
        ),
        lastValueFrom(
          this.httpService.get('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `token ${accessToken}`,
              'User-Agent': this.configService.get('app.name', 'Claude Agent Platform'),
            },
          })
        ),
      ]);

      const userData = userResponse.data;
      const emailsData = emailsResponse.data;

      const primaryEmail = emailsData.find((email: any) => email.primary && email.verified)?.email;

      if (!primaryEmail) {
        throw new BadRequestException('No verified primary email found');
      }

      return {
        id: userData.id.toString(),
        email: primaryEmail,
        name: userData.name,
        username: userData.login,
        avatar: userData.avatar_url,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch GitHub user profile');
    }
  }

  /**
   * Get Google user profile
   */
  private async getGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await lastValueFrom(
        this.httpService.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      const data = response.data;

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        firstName: data.given_name,
        lastName: data.family_name,
        avatar: data.picture,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }
  }

  /**
   * Get Microsoft user profile
   */
  private async getMicrosoftProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await lastValueFrom(
        this.httpService.get('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      const data = response.data;

      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        firstName: data.givenName,
        lastName: data.surname,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch Microsoft user profile');
    }
  }

  /**
   * Find or create user from OAuth profile
   */
  private async findOrCreateUser(provider: OAuthProvider, profile: OAuthProfile, tokens: OAuthTokens): Promise<any> {
    // Check if OAuth account already exists
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: profile.id,
        },
      },
      include: {
        user: true,
      },
    });

    if (oauthAccount) {
      // Update OAuth account with new tokens
      oauthAccount = await this.prisma.oAuthAccount.update({
        where: { id: oauthAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          scopes: tokens.scope ? tokens.scope.split(' ') : [],
          updatedAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      // Update user last login
      await this.prisma.user.update({
        where: { id: oauthAccount.user.id },
        data: { lastLoginAt: new Date() },
      });

      return this.authService.generateTokens(oauthAccount.user);
    }

    // Check if user with this email already exists
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email.toLowerCase() },
    });

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          username: profile.username || profile.email.split('@')[0],
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar,
          password: '', // OAuth users don't have passwords
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    // Create OAuth account
    oauthAccount = await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        metadata: {
          name: profile.name,
          avatar: profile.avatar,
        },
      },
      include: {
        user: true,
      },
    });

    return this.authService.generateTokens(user);
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(userId: string, provider: OAuthProvider, profile: OAuthProfile, tokens: OAuthTokens): Promise<void> {
    // Check if OAuth account already exists
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: profile.id,
        },
      },
    });

    if (existingOAuth) {
      throw new ConflictException('OAuth account already linked to another user');
    }

    // Create OAuth account link
    await this.prisma.oAuthAccount.create({
      data: {
        userId,
        provider,
        providerId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        metadata: {
          name: profile.name,
          avatar: profile.avatar,
        },
      },
    });
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: userId, // This would need to be adjusted based on your logic
        },
      },
    });

    if (!oauthAccount || oauthAccount.userId !== userId) {
      throw new UnauthorizedException('OAuth account not found');
    }

    await this.prisma.oAuthAccount.delete({
      where: { id: oauthAccount.id },
    });
  }

  /**
   * Get linked OAuth accounts for user
   */
  async getLinkedOAuthAccounts(userId: string): Promise<any[]> {
    const oauthAccounts = await this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        metadata: true,
        createdAt: true,
      },
    });

    return oauthAccounts.map(account => ({
      id: account.id,
      provider: account.provider,
      name: account.metadata?.name,
      avatar: account.metadata?.avatar,
      linkedAt: account.createdAt,
    }));
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshOAuthTokens(oauthAccountId: string): Promise<void> {
    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: { id: oauthAccountId },
    });

    if (!oauthAccount || !oauthAccount.refreshToken) {
      throw new UnauthorizedException('No refresh token available');
    }

    let newTokens: OAuthTokens;

    switch (oauthAccount.provider) {
      case OAuthProvider.GOOGLE:
        newTokens = await this.refreshGoogleTokens(oauthAccount.refreshToken);
        break;
      case OAuthProvider.GITHUB:
        throw new BadRequestException('GitHub does not support token refresh');
      case OAuthProvider.MICROSOFT:
        newTokens = await this.refreshMicrosoftTokens(oauthAccount.refreshToken);
        break;
      default:
        throw new BadRequestException('Unsupported OAuth provider');
    }

    await this.prisma.oAuthAccount.update({
      where: { id: oauthAccountId },
      data: {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || oauthAccount.refreshToken,
        expiresAt: newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000) : null,
        scopes: newTokens.scope ? newTokens.scope.split(' ') : oauthAccount.scopes,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Refresh Google tokens
   */
  private async refreshGoogleTokens(refreshToken: string): Promise<OAuthTokens> {
    const clientId = this.configService.get('oauth.google.clientId');
    const clientSecret = this.configService.get('oauth.google.clientSecret');

    try {
      const response = await lastValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        })
      );

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh Google tokens');
    }
  }

  /**
   * Refresh Microsoft tokens
   */
  private async refreshMicrosoftTokens(refreshToken: string): Promise<OAuthTokens> {
    const clientId = this.configService.get('oauth.microsoft.clientId');
    const clientSecret = this.configService.get('oauth.microsoft.clientSecret');
    const tenant = this.configService.get('oauth.microsoft.tenant', 'common');

    try {
      const response = await lastValueFrom(
        this.httpService.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh Microsoft tokens');
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
