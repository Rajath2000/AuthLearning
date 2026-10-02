import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

export interface TokenPayload {
  userId: string;
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly accessTokenExpiration = 900; // 15 minutes in seconds
  private readonly refreshTokenExpiration = 604800; // 7 days in seconds
  private privateKey!: string;
  private publicKey!: string;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {
    this.loadKeys();
  }

  /**
   * Load RSA keys from environment variables
   */
  private loadKeys(): void {
    const privateKeyBase64 = this.configService.get<string>('JWT_PRIVATE_KEY');
    const publicKeyBase64 = this.configService.get<string>('JWT_PUBLIC_KEY');

    if (!privateKeyBase64 || !publicKeyBase64) {
      throw new Error('JWT keys not configured in environment');
    }

    try {
      this.privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
      this.publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Failed to decode JWT keys from environment');
    }
  }

  /**
   * Generate both access and refresh tokens for a user
   * @param userId User UUID
   * @returns Object containing both tokens
   */
  async generateTokenPair(userId: string): Promise<TokenPair> {
    // Generate Access Token with 900 second (15 minute) expiration
    const accessPayload = {
      userId,
      tokenType: 'access' as const,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      algorithm: 'RS256' as const,
      privateKey: this.privateKey,
      expiresIn: this.accessTokenExpiration,
    });

    // Generate Refresh Token with 604800 second (7 day) expiration
    const refreshPayload = {
      userId,
      tokenType: 'refresh' as const,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      algorithm: 'RS256' as const,
      privateKey: this.privateKey,
      expiresIn: this.refreshTokenExpiration,
    });

    // Store refresh token hash in database (never store raw token)
    const now = Math.floor(Date.now() / 1000);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date((now + this.refreshTokenExpiration) * 1000);
    const issuedAt = new Date(now * 1000);

    await this.refreshTokenRepository.create({
      tokenId: uuidv4(),
      userId,
      tokenHash: refreshTokenHash,
      issuedAt,
      expiresAt,
      revoked: false,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode an access token
   * @param token JWT access token
   * @returns Decoded token payload
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtService.verify<TokenPayload>(token, {
        algorithms: ['RS256'],
        publicKey: this.publicKey,
      });

      if (decoded.tokenType !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return decoded;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token expired');
      }
      if (error?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Verify and decode a refresh token
   * @param token JWT refresh token
   * @returns Decoded token payload
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtService.verify<TokenPayload>(token, {
        algorithms: ['RS256'],
        publicKey: this.publicKey,
      });

      if (decoded.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return decoded;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      if (error?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Find a stored refresh token by hashing provided token and querying database
   * @param userId User UUID
   * @param token Raw refresh token
   * @returns Stored token entity or null if not found
   */
  async getStoredRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshTokenEntity | null> {
    try {
      // Hash the token for database lookup
      const tokenHash = await bcrypt.hash(token, 10);
      // Note: We need to compare the provided token with all stored hashes
      // because bcrypt doesn't allow reverse lookup. In production, you might
      // want to store the token with a lookup hash for performance.
      const storedTokens = await this.refreshTokenRepository.findActiveByUserId(userId);

      for (const storedToken of storedTokens) {
        const isMatch = await bcrypt.compare(token, storedToken.tokenHash);
        if (isMatch) {
          return storedToken;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke a specific refresh token by ID
   * @param tokenId Token ID
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, {
      revoked: true,
      updatedAt: new Date(),
    });
  }

  /**
   * Revoke all refresh tokens for a user (atomic operation)
   * @param userId User UUID
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllByUserId(userId);
  }

  /**
   * Get all active (non-revoked) refresh tokens for a user
   * @param userId User UUID
   * @returns Array of active token entities
   */
  async getActiveRefreshTokens(userId: string): Promise<RefreshTokenEntity[]> {
    return this.refreshTokenRepository.findActiveByUserId(userId);
  }
}
