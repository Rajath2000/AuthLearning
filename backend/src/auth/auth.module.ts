import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Entities
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { LoginAttemptEntity } from './entities/login-attempt.entity';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginAttemptRepository } from './repositories/login-attempt.repository';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { RateLimitService } from './services/rate-limit.service';
import { AuditService } from './services/audit.service';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Controllers
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      LoginAttemptEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const publicKeyBase64 = configService.get<string>('JWT_PUBLIC_KEY');
        const privateKeyBase64 = configService.get<string>('JWT_PRIVATE_KEY');

        if (!publicKeyBase64 || !privateKeyBase64) {
          throw new Error(
            'JWT_PUBLIC_KEY and JWT_PRIVATE_KEY environment variables are required',
          );
        }

        // Decode base64-encoded keys to PEM format
        let publicKey: string;
        let privateKey: string;
        try {
          publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
          privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
        } catch (error) {
          throw new Error('Failed to decode JWT keys from base64');
        }

        return {
          publicKey: publicKey,
          privateKey: privateKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '15m',
          },
        };
      },
    }),
  ],
  providers: [
    // Services
    AuthService,
    UserService,
    TokenService,
    PasswordService,
    RateLimitService,
    AuditService,
    // Strategies
    JwtStrategy,
    // Guards
    JwtAuthGuard,
    // Repositories
    UserRepository,
    RefreshTokenRepository,
    LoginAttemptRepository,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, TokenService],
})
export class AuthModule {}
