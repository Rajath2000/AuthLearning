import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../services/user.service';

export interface TokenPayload {
  userId: string;
  tokenType: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * Passport JWT strategy for extracting and validating JWT tokens from requests
 * Uses RS256 public key for signature verification
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private userService: UserService,
  ) {
    const publicKeyBase64 = configService.get<string>('JWT_PUBLIC_KEY');
    if (!publicKeyBase64) {
      throw new Error('JWT_PUBLIC_KEY environment variable is required');
    }

    // Decode base64-encoded public key to PEM format
    let publicKey: string;
    try {
      publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Failed to decode JWT_PUBLIC_KEY from base64');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      secretOrKey: publicKey,
    });
  }

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    const user = await this.userService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return payload;
  }
}
