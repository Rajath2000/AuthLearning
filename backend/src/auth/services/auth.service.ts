import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { TokenService, TokenPayload } from './token.service';
import { PasswordService } from './password.service';
import { RateLimitService } from './rate-limit.service';
import { AuditService } from './audit.service';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

@Injectable()
export class AuthService {
  // Email validation regex (simplified RFC 5322)
  private readonly emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Password validation regex
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (@$!%*?&)
  private readonly passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private rateLimitService: RateLimitService,
    private auditService: AuditService,
  ) {}

  /**
   * Register a new user with email and password
   * @param registerDto Registration data
   * @returns User data response
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Validate input
    this.validateRegisterInput(registerDto);

    const normalizedEmail = registerDto.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await this.userService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(
      registerDto.password,
    );

    // Create user
    const user = await this.userService.create(normalizedEmail, passwordHash);

    // Log event
    await this.auditService.logEvent('user_registered', {
      userId: user.userId,
      email: user.email,
    });

    // Return response (never include password hash)
    return {
      userId: user.userId,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Authenticate user with email and password
   * @param loginDto Login credentials
   * @returns Access and refresh tokens
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = loginDto.email.toLowerCase().trim();

    try {
      // Check if account is locked due to failed attempts
      const isLocked = await this.rateLimitService.isAccountLocked(
        normalizedEmail,
      );
      if (isLocked) {
        throw new HttpException(
          'Account locked due to multiple failed attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Find user by email
      const user = await this.userService.findByEmail(normalizedEmail);
      if (!user) {
        // Record failed attempt
        await this.rateLimitService.recordFailedAttempt(normalizedEmail);
        await this.auditService.logEvent('login_failed', {
          email: normalizedEmail,
          reason: 'email_not_found',
        });
        // Return generic error (don't reveal if email exists)
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.passwordService.verifyPassword(
        loginDto.password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        // Record failed attempt
        await this.rateLimitService.recordFailedAttempt(normalizedEmail);
        await this.auditService.logEvent('login_failed', {
          userId: user.userId,
          email: normalizedEmail,
          reason: 'password_invalid',
        });
        // Return generic error
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user.userId);

      // Clear rate limit on successful login
      await this.rateLimitService.clearFailedAttempts(normalizedEmail);
      await this.rateLimitService.recordSuccessfulAttempt(normalizedEmail);

      // Log success
      await this.auditService.logEvent('login_success', {
        userId: user.userId,
        email: user.email,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes in seconds
      };
    } catch (error) {
      // Re-throw any exceptions
      if (error instanceof HttpException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Refresh an expired access token using a refresh token
   * @param refreshTokenDto Refresh token
   * @returns New access and refresh tokens
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    // Validate token format
    if (!refreshTokenDto.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    if (!this.isValidJwtFormat(refreshTokenDto.refreshToken)) {
      throw new BadRequestException('Invalid token format');
    }

    // Decode and verify refresh token
    let decoded: TokenPayload;
    try {
      decoded = await this.tokenService.verifyRefreshToken(
        refreshTokenDto.refreshToken,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }

    // Find stored refresh token and check if revoked
    const storedToken = await this.tokenService.getStoredRefreshToken(
      decoded.userId,
      refreshTokenDto.refreshToken,
    );

    if (!storedToken || storedToken.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new token pair
    const newTokens = await this.tokenService.generateTokenPair(decoded.userId);

    // Revoke old refresh token (atomic)
    await this.tokenService.revokeRefreshToken(storedToken.tokenId);

    // Log event
    await this.auditService.logEvent('token_refreshed', {
      userId: decoded.userId,
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Logout user by revoking all refresh tokens
   * @param userId User UUID
   */
  async logout(userId: string): Promise<void> {
    // Get all active refresh tokens
    const activeTokens = await this.tokenService.getActiveRefreshTokens(userId);

    // Revoke all tokens in atomic operation
    await this.tokenService.revokeAllRefreshTokens(userId);

    // Log event
    await this.auditService.logEvent('logout_success', {
      userId,
      tokensRevoked: activeTokens.length,
    });
  }

  /**
   * Validate registration input
   * @param registerDto Registration data
   * @throws BadRequestException if validation fails
   */
  private validateRegisterInput(registerDto: RegisterDto): void {
    const { email, password } = registerDto;

    // Check email required
    if (!email || email.trim().length === 0) {
      throw new BadRequestException('Email is required');
    }

    // Check password required
    if (!password || password.length === 0) {
      throw new BadRequestException('Password is required');
    }

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate email length
    if (email.length > 128) {
      throw new BadRequestException('Email exceeds maximum length of 128 characters');
    }

    // Validate password format
    if (!this.isValidPassword(password)) {
      throw new BadRequestException(
        'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character',
      );
    }

    // Validate password length
    if (password.length > 128) {
      throw new BadRequestException(
        'Password exceeds maximum length of 128 characters',
      );
    }
  }

  /**
   * Check if email is in valid format
   * @param email Email to validate
   * @returns true if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  /**
   * Check if password meets requirements
   * @param password Password to validate
   * @returns true if valid, false otherwise
   */
  private isValidPassword(password: string): boolean {
    return this.passwordRegex.test(password);
  }

  /**
   * Check if a string is in valid JWT format (3 parts separated by dots)
   * @param token Token string
   * @returns true if valid JWT format, false otherwise
   */
  private isValidJwtFormat(token: string): boolean {
    return token.split('.').length === 3;
  }
}
