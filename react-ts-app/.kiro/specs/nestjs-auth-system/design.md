# Design Document: NestJS Authentication System

## Overview

The NestJS Authentication System is a production-grade authentication service built with NestJS, TypeScript, and SQLite. It implements JWT-based authentication with RS256 signing, bcrypt password hashing, token refresh mechanisms, rate limiting, account lockout, and comprehensive security measures. The system follows layered architecture principles with clear separation between HTTP handling, business logic, data access, and external integrations.

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ HTTP Layer (Controllers)                                         │
│ - AuthController (register, login, refresh, logout endpoints)   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Guard & Middleware Layer (JWT Strategy, Authentication Guards)  │
│ - JwtAuthGuard                                                   │
│ - JwtStrategy (Passport)                                         │
│ - RateLimitMiddleware                                            │
│ - ValidationPipe                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Business Logic Layer (Services)                                  │
│ - AuthService (orchestrates authentication flows)                │
│ - UserService (user management)                                  │
│ - TokenService (JWT generation and validation)                   │
│ - PasswordService (hashing and verification)                     │
│ - RateLimitService (rate limiting logic)                         │
│ - AuditService (logging)                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Data Access Layer (Repositories)                                 │
│ - UserRepository (user CRUD operations)                          │
│ - RefreshTokenRepository (token management)                      │
│ - LoginAttemptRepository (rate limit tracking)                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Database Layer (SQLite with TypeORM)                             │
│ - users table                                                    │
│ - refresh_tokens table                                           │
│ - login_attempts table                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/
├── auth/
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── token.service.ts
│   │   ├── password.service.ts
│   │   ├── rate-limit.service.ts
│   │   └── audit.service.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── local-auth.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── refresh-token.repository.ts
│   │   └── login-attempt.repository.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── refresh-token.entity.ts
│   │   └── login-attempt.entity.ts
│   ├── dtos/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   ├── auth-response.dto.ts
│   │   └── error-response.dto.ts
│   ├── exceptions/
│   │   ├── auth.exception.ts
│   │   └── custom-http.exception.ts
│   ├── interceptors/
│   │   └── auth-response.interceptor.ts
│   ├── pipes/
│   │   └── auth-validation.pipe.ts
│   ├── filters/
│   │   └── auth-exception.filter.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── config/
│   │   ├── jwt.config.ts
│   │   └── auth.config.ts
│   └── auth.module.ts
├── common/
│   ├── decorators/
│   ├── exceptions/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── middleware/
│   └── pipes/
├── database/
│   └── migrations/
└── app.module.ts
```

---

## Key Components

### 1. AuthController

**Responsibility**: Handle HTTP requests and delegate to business logic

```typescript
// src/auth/controllers/auth.controller.ts

@Controller('api/auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AuthResponseInterceptor)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthResponseInterceptor)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthResponseInterceptor)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthResponseInterceptor)
  async logout(@CurrentUser() user: TokenPayload): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logout successful' };
  }
}
```

**Key Responsibilities:**
- Map HTTP requests to service methods
- Apply authentication guards and validation pipes
- Apply response interceptors for consistent formatting
- Apply exception filters for error handling
- Return appropriate HTTP status codes

### 2. AuthService

**Responsibility**: Orchestrate authentication flows and business logic

```typescript
// src/auth/services/auth.service.ts

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private rateLimitService: RateLimitService,
    private auditService: AuditService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // 1. Validate input
    this.validateRegisterInput(registerDto);

    // 2. Check email uniqueness
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 3. Hash password
    const passwordHash = await this.passwordService.hashPassword(
      registerDto.password,
    );

    // 4. Create user record
    const user = await this.userService.create({
      email: registerDto.email.toLowerCase(),
      passwordHash,
    });

    // 5. Log event
    await this.auditService.logEvent('user_registered', {
      userId: user.userId,
      email: user.email,
    });

    return {
      userId: user.userId,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    try {
      // 1. Check rate limit before attempting login
      const isLocked = await this.rateLimitService.isAccountLocked(
        normalizedEmail,
      );
      if (isLocked) {
        throw new TooManyRequestsException(
          'Account locked due to multiple failed attempts',
        );
      }

      // 2. Retrieve user
      const user = await this.userService.findByEmail(normalizedEmail);
      if (!user) {
        await this.rateLimitService.recordFailedAttempt(normalizedEmail);
        await this.auditService.logEvent('login_failed', {
          email: normalizedEmail,
          reason: 'email_not_found',
        });
        throw new UnauthorizedException('Invalid email or password');
      }

      // 3. Verify password
      const isPasswordValid = await this.passwordService.verifyPassword(
        password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        await this.rateLimitService.recordFailedAttempt(normalizedEmail);
        await this.auditService.logEvent('login_failed', {
          userId: user.userId,
          email: normalizedEmail,
          reason: 'password_invalid',
        });
        throw new UnauthorizedException('Invalid email or password');
      }

      // 4. Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user.userId);

      // 5. Clear rate limit on successful login
      await this.rateLimitService.clearFailedAttempts(normalizedEmail);

      // 6. Log event
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
      throw error;
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    // 1. Validate token format
    if (!refreshTokenDto.refreshToken || !this.isValidJwtFormat(refreshTokenDto.refreshToken)) {
      throw new BadRequestException('Invalid token format');
    }

    // 2. Decode and validate refresh token
    const decoded = await this.tokenService.verifyRefreshToken(
      refreshTokenDto.refreshToken,
    );

    // 3. Check if token is stored and not revoked
    const storedToken = await this.tokenService.getStoredRefreshToken(
      decoded.userId,
      refreshTokenDto.refreshToken,
    );
    if (!storedToken || storedToken.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // 4. Generate new token pair
    const newTokens = await this.tokenService.generateTokenPair(decoded.userId);

    // 5. Revoke old refresh token atomically
    await this.tokenService.revokeRefreshToken(storedToken.tokenId);

    // 6. Log event
    await this.auditService.logEvent('token_refreshed', {
      userId: decoded.userId,
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  async logout(userId: string): Promise<void> {
    // 1. Retrieve all active refresh tokens for user
    const activeTokens = await this.tokenService.getActiveRefreshTokens(userId);

    // 2. Revoke all tokens atomically
    await this.tokenService.revokeAllRefreshTokens(userId);

    // 3. Log event
    await this.auditService.logEvent('logout_success', {
      userId,
      tokensRevoked: activeTokens.length,
    });
  }

  private validateRegisterInput(registerDto: RegisterDto): void {
    const { email, password } = registerDto;

    if (!email || email.trim().length === 0) {
      throw new BadRequestException('Email is required');
    }

    if (!password || password.length === 0) {
      throw new BadRequestException('Password is required');
    }

    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (!this.isValidPassword(password)) {
      throw new BadRequestException(
        'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character',
      );
    }

    if (password.length > 128) {
      throw new BadRequestException('Password exceeds maximum length of 128 characters');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private isValidJwtFormat(token: string): boolean {
    return token.split('.').length === 3;
  }
}
```

**Key Responsibilities:**
- Orchestrate multi-step authentication workflows
- Validate business logic constraints
- Coordinate between services
- Handle errors and exceptions
- Maintain transaction integrity

### 3. TokenService

**Responsibility**: JWT generation, validation, and refresh token management

```typescript
// src/auth/services/token.service.ts

@Injectable()
export class TokenService {
  private readonly accessTokenExpiration = 900; // 15 minutes
  private readonly refreshTokenExpiration = 604800; // 7 days
  private jwtService: JwtService;
  private publicKey: string;
  private privateKey: string;

  constructor(
    private configService: ConfigService,
    private refreshTokenRepository: RefreshTokenRepository,
    private jwtService: JwtService,
  ) {
    this.loadKeys();
  }

  private loadKeys(): void {
    this.privateKey = this.configService.get<string>('JWT_PRIVATE_KEY');
    this.publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');

    if (!this.privateKey || !this.publicKey) {
      throw new Error('JWT keys not configured');
    }
  }

  async generateTokenPair(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const now = Math.floor(Date.now() / 1000);

    // Generate Access Token
    const accessPayload: TokenPayload = {
      userId,
      tokenType: 'access',
      iat: now,
      exp: now + this.accessTokenExpiration,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      algorithm: 'RS256',
      privateKey: this.privateKey,
      header: {
        kid: this.configService.get<string>('JWT_KEY_ID', 'key-1'),
      },
    });

    // Generate Refresh Token
    const refreshPayload: TokenPayload = {
      userId,
      tokenType: 'refresh',
      iat: now,
      exp: now + this.refreshTokenExpiration,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      algorithm: 'RS256',
      privateKey: this.privateKey,
      header: {
        kid: this.configService.get<string>('JWT_KEY_ID', 'key-1'),
      },
    });

    // Store refresh token hash in database
    const refreshTokenHash = await this.hashToken(refreshToken);
    await this.refreshTokenRepository.create({
      tokenId: generateUUID(),
      userId,
      tokenHash: refreshTokenHash,
      issuedAt: new Date(now * 1000),
      expiresAt: new Date((now + this.refreshTokenExpiration) * 1000),
      revoked: false,
    });

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtService.verify(token, {
        algorithms: ['RS256'],
        publicKey: this.publicKey,
      });

      if (decoded.tokenType !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return decoded as TokenPayload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtService.verify(token, {
        algorithms: ['RS256'],
        publicKey: this.publicKey,
      });

      if (decoded.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return decoded as TokenPayload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  async getStoredRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshTokenEntity | null> {
    const tokenHash = await this.hashToken(token);
    return this.refreshTokenRepository.findByUserIdAndHash(userId, tokenHash);
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, {
      revoked: true,
      updatedAt: new Date(),
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllByUserId(userId);
  }

  async getActiveRefreshTokens(userId: string): Promise<RefreshTokenEntity[]> {
    return this.refreshTokenRepository.findActiveByUserId(userId);
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }
}
```

**Key Responsibilities:**
- Generate access and refresh tokens with RS256 signing
- Validate token signatures and expiration
- Manage refresh token storage and revocation
- Handle key management and rotation

### 4. PasswordService

**Responsibility**: Password hashing and verification

```typescript
// src/auth/services/password.service.ts

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    // Use constant-time comparison
    return bcrypt.compare(password, passwordHash);
  }

  isValidPasswordHash(hash: string): boolean {
    // Verify hash starts with bcrypt prefix
    return /^\$2[aby]\$\d{2}\$/.test(hash);
  }
}
```

**Key Responsibilities:**
- Hash passwords using bcrypt with salt round 10
- Verify passwords using constant-time comparison
- Validate password hash format

### 5. RateLimitService

**Responsibility**: Rate limiting and account lockout logic

```typescript
// src/auth/services/rate-limit.service.ts

@Injectable()
export class RateLimitService {
  private readonly maxFailedAttempts = 5;
  private readonly lockoutWindow = 15 * 60 * 1000; // 15 minutes in milliseconds

  constructor(
    private loginAttemptRepository: LoginAttemptRepository,
  ) {}

  async recordFailedAttempt(email: string): Promise<void> {
    const windowStart = new Date(Date.now() - this.lockoutWindow);

    await this.loginAttemptRepository.create({
      attemptId: generateUUID(),
      email: email.toLowerCase(),
      success: false,
      timestamp: new Date(),
    });

    // Cleanup old attempts outside the lockout window
    await this.loginAttemptRepository.deleteOlderThan(windowStart);
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - this.lockoutWindow);

    const failedAttempts = await this.loginAttemptRepository.countFailedAttempts(
      email.toLowerCase(),
      windowStart,
    );

    return failedAttempts >= this.maxFailedAttempts;
  }

  async clearFailedAttempts(email: string): Promise<void> {
    await this.loginAttemptRepository.deleteByEmail(email.toLowerCase());
  }

  async recordSuccessfulAttempt(email: string): Promise<void> {
    await this.loginAttemptRepository.create({
      attemptId: generateUUID(),
      email: email.toLowerCase(),
      success: true,
      timestamp: new Date(),
    });
  }
}
```

**Key Responsibilities:**
- Track failed login attempts
- Implement account lockout after 5 failed attempts in 15 minutes
- Automatically unlock accounts after timeout period

### 6. JwtStrategy

**Responsibility**: Passport JWT strategy for request authentication

```typescript
// src/auth/strategies/jwt.strategy.ts

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private publicKey: string;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      publicKey,
    });
    this.publicKey = publicKey;
  }

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    // Verify token type
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify user still exists
    const user = await this.userService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return payload;
  }
}
```

**Key Responsibilities:**
- Extract JWT from Authorization header
- Validate JWT signature using RS256 public key
- Verify token payload and user existence

### 7. JwtAuthGuard

**Responsibility**: Protect endpoints requiring authentication

```typescript
// src/auth/guards/jwt-auth.guard.ts

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any): any {
    if (err) {
      throw err;
    }

    if (!user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
```

**Key Responsibilities:**
- Validate JWT on protected routes
- Return 401 for missing or invalid tokens
- Attach decoded user to request object

### 8. DTOs (Data Transfer Objects)

```typescript
// src/auth/dtos/register.dto.ts
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

// src/auth/dtos/login.dto.ts
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// src/auth/dtos/refresh-token.dto.ts
export class RefreshTokenDto {
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}

// src/auth/dtos/auth-response.dto.ts
export class AuthResponseDto {
  userId?: string;
  email?: string;
  createdAt?: Date;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

// src/auth/dtos/error-response.dto.ts
export class ErrorResponseDto {
  status: number;
  message: string;
  error: string;
  timestamp: string;
  details?: Record<string, any>;
}
```

---

## Database Schema

### Entity Models and Tables

#### 1. Users Table

```typescript
// src/auth/entities/user.entity.ts

@Entity('users')
@Index('idx_users_email', { synchronize: true })
export class UserEntity {
  @PrimaryColumn('text')
  userId: string; // UUID

  @Column('text', { unique: true })
  email: string;

  @Column('varchar', { length: 60 })
  passwordHash: string; // bcrypt hash

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => RefreshTokenEntity, (token) => token.user, {
    cascade: ['remove'],
  })
  refreshTokens: RefreshTokenEntity[];
}

// SQL
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash VARCHAR(60) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

#### 2. Refresh Tokens Table

```typescript
// src/auth/entities/refresh-token.entity.ts

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', { synchronize: true })
@Index('idx_refresh_tokens_revoked', { synchronize: true })
export class RefreshTokenEntity {
  @PrimaryColumn('text')
  tokenId: string; // UUID

  @Column('text')
  userId: string; // Foreign key

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column('varchar', { length: 60 })
  tokenHash: string; // bcrypt hash of token

  @Column('datetime')
  issuedAt: Date;

  @Column('datetime')
  expiresAt: Date;

  @Column('boolean', { default: false })
  revoked: boolean;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}

// SQL
CREATE TABLE refresh_tokens (
  token_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash VARCHAR(60) NOT NULL,
  issued_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked);
```

#### 3. Login Attempts Table

```typescript
// src/auth/entities/login-attempt.entity.ts

@Entity('login_attempts')
@Index('idx_login_attempts_email', { synchronize: true })
@Index('idx_login_attempts_timestamp', { synchronize: true })
export class LoginAttemptEntity {
  @PrimaryColumn('text')
  attemptId: string; // UUID

  @Column('text')
  email: string;

  @Column('boolean')
  success: boolean;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}

// SQL
CREATE TABLE login_attempts (
  attempt_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts(timestamp);
```

### Schema Relationships

```
users (1) ──────── (N) refresh_tokens
  ↓ user_id
  │
  ├─ DELETE CASCADE on user deletion
  │
  └─ Refresh tokens automatically revoked on logout
```

---

## JWT Implementation

### Token Structure

#### Access Token
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-1"
  },
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "tokenType": "access",
    "iat": 1609459200,
    "exp": 1609460100
  },
  "signature": "..."
}
```

#### Refresh Token
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-1"
  },
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "tokenType": "refresh",
    "iat": 1609459200,
    "exp": 1610064000
  },
  "signature": "..."
}
```

### RS256 Implementation (RSA with SHA-256)

**Key Generation Process:**

```bash
# Generate private key (4096-bit RSA)
openssl genrsa -out private.key 4096

# Extract public key from private key
openssl rsa -in private.key -pubout -out public.key

# Store keys as environment variables (BASE64 encoded)
JWT_PRIVATE_KEY=$(cat private.key | base64)
JWT_PUBLIC_KEY=$(cat public.key | base64)
```

**Signing Process:**

```typescript
const payload = {
  userId,
  tokenType: 'access',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900,
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  header: { kid: 'key-1' },
});
```

**Verification Process:**

```typescript
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
});
```

### Key Rotation Strategy

```typescript
// Key rotation supports gradual migration
// Keep track of multiple key versions
{
  "key-1": { publicKey: "...", status: "current" },
  "key-0": { publicKey: "...", status: "deprecated" }
}

// Accept both current and deprecated keys for verification
// Only sign with current key
// Periodically revoke deprecated keys
```

---

## Password Hashing Strategy

### Bcrypt Implementation

```typescript
// Hash function
const hash = await bcrypt.hash(plainPassword, 10);
// Output: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86AGR0IujlO

// Verify function (constant-time comparison)
const isValid = await bcrypt.compare(plainPassword, hash);
```

### Bcrypt Hash Structure

```
$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86AGR0IujlO
│   ││││││││││││││││││││││││││││││││││││││││││││││││││││││││
│   │ 10 = salt rounds
│   2b = bcrypt variant (newest)
│
└─ "$2b$" = algorithm identifier
```

### Security Properties

- **Salt Rounds**: 10 (recommended for 2024+)
- **Hashing Time**: ~100ms per hash (intentional slowness)
- **Salt**: Randomly generated and included in hash
- **Comparison**: Constant-time to prevent timing attacks
- **Storage**: Minimum 60 characters to accommodate full bcrypt output

---

## Rate Limiting and Account Lockout

### Algorithm

```
RATE_LIMIT_CONFIG:
  - MAX_FAILED_ATTEMPTS = 5
  - LOCKOUT_WINDOW = 15 minutes
  - CLEANUP_THRESHOLD = 30 minutes

FUNCTION checkRateLimit(email):
  failedAttempts = countFailedAttempts(email, last 15 minutes)
  IF failedAttempts >= MAX_FAILED_ATTEMPTS:
    RETURN AccountLocked
  RETURN OK

FUNCTION recordFailedAttempt(email):
  INSERT LoginAttempt(email, success=false, timestamp=now())
  DELETE LoginAttempts WHERE timestamp < (now() - 30 minutes)

FUNCTION onSuccessfulLogin(email):
  DELETE LoginAttempts WHERE email=email
```

### Implementation

```typescript
@Post('login')
async login(@Body() loginDto: LoginDto) {
  const email = loginDto.email.toLowerCase();

  // 1. Check if account is locked
  if (await this.rateLimitService.isAccountLocked(email)) {
    throw new TooManyRequestsException(
      'Account locked due to multiple failed attempts'
    );
  }

  // 2. Attempt login
  try {
    const result = await this.authService.login(loginDto);
    
    // 3. Clear failed attempts on success
    await this.rateLimitService.clearFailedAttempts(email);
    
    return result;
  } catch (error) {
    // 4. Record failed attempt
    await this.rateLimitService.recordFailedAttempt(email);
    throw error;
  }
}
```

### Database Query Optimization

```sql
-- Efficient rate limit check
SELECT COUNT(*) as failed_count
FROM login_attempts
WHERE email = ? 
  AND success = 0
  AND timestamp > datetime('now', '-15 minutes')
```

---

## Error Handling and Validation Pipeline

### Exception Hierarchy

```typescript
// src/auth/exceptions/auth.exception.ts

export class AuthException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly errorCode: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message, statusCode);
  }
}

export class InvalidCredentialsException extends AuthException {
  constructor(message = 'Invalid email or password') {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }
}

export class AccountLockedException extends AuthException {
  constructor(message = 'Account locked due to multiple failed attempts') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'ACCOUNT_LOCKED');
  }
}

export class EmailAlreadyExistsException extends AuthException {
  constructor(message = 'Email already registered') {
    super(message, HttpStatus.CONFLICT, 'EMAIL_EXISTS');
  }
}
```

### Validation Pipeline

```typescript
// src/auth/pipes/auth-validation.pipe.ts

@Injectable()
export class AuthValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    // 1. Check if value is empty
    if (!value || Object.keys(value).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    // 2. Check request size
    if (JSON.stringify(value).length > 1024 * 1024) {
      throw new PayloadTooLargeException('Payload exceeds 1 MB');
    }

    // 3. Trim string fields
    Object.keys(value).forEach((key) => {
      if (typeof value[key] === 'string') {
        value[key] = value[key].trim();
      }
    });

    // 4. Validate using class-validator
    const object = plainToClass(metadata.type, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new BadRequestException(this.formatValidationErrors(errors));
    }

    return value;
  }

  private formatValidationErrors(errors: ValidationError[]): string {
    return errors
      .map((error) => {
        const constraints = Object.values(error.constraints || {});
        return `${error.property}: ${constraints.join(', ')}`;
      })
      .join('; ');
  }
}
```

### Exception Filter

```typescript
// src/auth/filters/auth-exception.filter.ts

@Catch(HttpException, AuthException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException | AuthException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message || 'An unexpected error occurred';
    const errorCode = (exception as any).errorCode || 'UNKNOWN_ERROR';

    const errorResponse: ErrorResponseDto = {
      status,
      message,
      error: errorCode,
      timestamp: new Date().toISOString(),
      details: (exception as any).details,
    };

    response.status(status).json(errorResponse);
  }
}
```

---

## Security Considerations

### 1. CORS Configuration

```typescript
// src/main.ts

const app = await NestFactory.create(AppModule);

app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 3600,
});

app.listen(3001);
```

### 2. HTTPS Enforcement

```typescript
// src/main.ts

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 3. Environment Variables

```bash
# .env (Never commit to version control)

# JWT Configuration
JWT_PRIVATE_KEY=<BASE64_ENCODED_PRIVATE_KEY>
JWT_PUBLIC_KEY=<BASE64_ENCODED_PUBLIC_KEY>
JWT_KEY_ID=key-1

# Database
DATABASE_URL=file:./auth.db

# Security
FRONTEND_URL=https://app.example.com
NODE_ENV=production
SESSION_SECRET=<RANDOM_32_CHAR_STRING>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

### 4. Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet());
// Sets:
// - X-Frame-Options: DENY (prevent clickjacking)
// - X-Content-Type-Options: nosniff (prevent MIME sniffing)
// - X-XSS-Protection: 1; mode=block (XSS protection)
// - Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 5. Input Sanitization

```typescript
// Sanitize all string inputs
Object.keys(value).forEach((key) => {
  if (typeof value[key] === 'string') {
    value[key] = value[key].trim();
    // Remove null bytes
    if (value[key].includes('\0')) {
      throw new BadRequestException('Invalid input');
    }
  }
});
```

### 6. SQL Injection Prevention

```typescript
// Use TypeORM parameterized queries (safe from SQL injection)
const user = await this.userRepository.findOne({
  where: { email: email }, // Parameterized
});

// ❌ NEVER do string concatenation:
// const user = await this.userRepository.query(
//   `SELECT * FROM users WHERE email = '${email}'`
// );
```

### 7. OWASP Top 10 Compliance

| Threat | Mitigation |
|--------|-----------|
| Injection | Parameterized queries, input validation |
| Broken Authentication | JWT with RS256, rate limiting, password hashing |
| Sensitive Data Exposure | HTTPS only, never log passwords, encrypted keys |
| XML External Entities | Not applicable (JSON API) |
| Broken Access Control | JWT validation on protected routes |
| Security Misconfiguration | Secure defaults, environment variables |
| XSS | CORS validation, HTTP-only cookies |
| Insecure Deserialization | Input validation, class-validator |
| Using Components with Known Vulnerabilities | Regular npm audit, dependency updates |
| Insufficient Logging & Monitoring | Comprehensive audit trail |

---

## API Endpoint Designs

### 1. Register Endpoint

**Request:**
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation:**
- Email: Valid RFC 5322 format
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
- Request size: Max 1 MB

**Success Response (201 Created):**
```json
{
  "status": 201,
  "message": "User registered successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "status": 400,
  "message": "Invalid email format",
  "error": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}

// 409 Conflict
{
  "status": 409,
  "message": "Email already registered",
  "error": "EMAIL_EXISTS",
  "timestamp": "2024-01-15T10:30:00Z"
}

// 413 Payload Too Large
{
  "status": 413,
  "message": "Payload exceeds 1 MB",
  "error": "PAYLOAD_TOO_LARGE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Login Endpoint

**Request:**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "status": 401,
  "message": "Invalid email or password",
  "error": "INVALID_CREDENTIALS",
  "timestamp": "2024-01-15T10:30:00Z"
}

// 429 Too Many Requests
{
  "status": 429,
  "message": "Account locked due to multiple failed attempts",
  "error": "ACCOUNT_LOCKED",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Refresh Token Endpoint

**Request:**
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0..."
}
```

**Success Response (200 OK):**
```json
{
  "status": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "status": 400,
  "message": "Invalid token format",
  "error": "INVALID_TOKEN_FORMAT",
  "timestamp": "2024-01-15T10:30:00Z"
}

// 401 Unauthorized
{
  "status": 401,
  "message": "Refresh token has been revoked",
  "error": "TOKEN_REVOKED",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Logout Endpoint

**Request:**
```
POST /api/auth/logout
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "status": 200,
  "message": "Logout successful",
  "data": {},
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "status": 401,
  "message": "Authorization header missing or invalid",
  "error": "UNAUTHORIZED",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Email Uniqueness Constraint

*For any* two registration requests with the same email address, the second request must fail with HTTP 409 Conflict and return error message "Email already registered", while the first registration must succeed with HTTP 201 Created.

**Validates: Requirements 1.3**

### Property 2: Password Hash Non-reversibility

*For any* stored password hash in the database, there must be no method to recover or compute the original plaintext password from the hash, and all hashes must conform to bcrypt format starting with "$2b$" prefix.

**Validates: Requirements 1.4, 7.1, 7.5**

### Property 3: Identical Password Verification Consistency

*For any* user with a stored password hash, calling the password verification function with the same plaintext password must always return true, and calling with any different password must always return false.

**Validates: Requirements 2.2, 7.3, 7.8**

### Property 4: Login Credential Neutrality

*For any* login request with a non-existent email and any request with wrong password, the system must return HTTP 401 Unauthorized with identical error message "Invalid email or password", preventing attackers from enumerating valid email addresses.

**Validates: Requirements 2.4, 2.5, 11.7**

### Property 5: Failed Login Attempt Tracking

*For any* email address, after 5 failed login attempts within 15 minutes, all subsequent login requests must return HTTP 429 Too Many Requests with message "Account locked due to multiple failed attempts", and this lockout must automatically expire after 15 minutes from the first failed attempt.

**Validates: Requirements 2.9, 11.6**

### Property 6: Successful Login Clears Rate Limit

*For any* email address with a lockout due to failed attempts, a successful login must clear all recorded failed attempts for that email, allowing immediate subsequent login attempts without HTTP 429 response.

**Validates: Requirements 2.9, 11.6**

### Property 7: JWT Access Token Expiration Precision

*For any* AccessToken with an expiration timestamp (exp claim), the token must be valid until the exact expiration time (checked with second-level precision) and must be rejected with HTTP 401 Unauthorized message "Access token expired" at or after the expiration time.

**Validates: Requirements 3.5, 3.6**

### Property 8: JWT Signature Verification

*For any* AccessToken, the token must be verifiable using the corresponding RS256 public key, and any modification to the token payload or signature must result in verification failure with HTTP 401 Unauthorized message "Invalid token".

**Validates: Requirements 3.7**

### Property 9: Access Token Missing Header Rejection

*For any* authenticated API request without an Authorization header or with an invalid Authorization header, the system must return HTTP 401 Unauthorized with message "Authorization header missing".

**Validates: Requirements 3.8**

### Property 10: Token Type Validation

*For any* JWT token presented as an AccessToken, the token_type claim must be "access", and tokens with token_type "refresh" or any other value must be rejected with HTTP 401 Unauthorized.

**Validates: Requirements 3.2, 4.2**

### Property 11: Refresh Token Storage Security

*For any* RefreshToken, the raw token must never be stored in plaintext in the database; only bcrypt hashes (minimum length 60 characters) must be persisted, matching password hash security level with salt round 10.

**Validates: Requirements 4.3, 4.5**

### Property 12: Refresh Token Atomic Rotation

*For any* successful token refresh request, the old RefreshToken must be marked as revoked in the database AND a new RefreshToken must be generated and stored, atomically. If either operation fails, both must fail (transaction rollback).

**Validates: Requirements 5.7, 5.3**

### Property 13: Refresh Token Expiration Consistency

*For any* stored RefreshToken in the database, the expires_at timestamp must match the JWT exp claim to within 1 second, ensuring consistency between database records and token claims.

**Validates: Requirements 4.3**

### Property 14: Revoked Token Rejection

*For any* RefreshToken marked with revoked=true in the database, all subsequent attempts to use that token for refresh must return HTTP 401 Unauthorized with message "Refresh token has been revoked", regardless of JWT signature validity.

**Validates: Requirements 5.3, 6.8**

### Property 15: Complete Logout Revocation

*For any* logout request for a user, ALL active RefreshTokens for that user (with revoked=false) must be set to revoked=true in a single atomic database transaction, and no active tokens may remain after logout completes.

**Validates: Requirements 6.2, 6.3**

### Property 16: Logout Idempotency

*For any* user performing multiple consecutive logout requests, the first logout must succeed with HTTP 200 OK, and all subsequent logout requests within the same session must also return HTTP 200 OK with message "Logout successful".

**Validates: Requirements 6.4**

### Property 17: Email Lowercase Normalization

*For any* registration with an email address in mixed case (e.g., "User@Example.COM") and any login attempt with the same email in different case (e.g., "user@example.com"), both must refer to the same user account, with the stored email in lowercase.

**Validates: Requirements 1.5**

### Property 18: Input Validation Completeness

*For any* API request with missing required fields (email or password), or with fields exceeding maximum lengths (email, password > 128 chars), or with invalid formats, the system must return HTTP 400 Bad Request with a message identifying the specific field and violation.

**Validates: Requirements 1.7, 1.8, 2.6, 2.7, 8.10**

### Property 19: Password Field Requirement Validation

*For any* registration or login request where the password field is empty, null, or missing, the system must return HTTP 400 Bad Request with message "Password is required" before any cryptographic operations are performed.

**Validates: Requirements 1.8, 2.7**

### Property 20: Consistent Error Response Structure

*For any* error response returned by the system, all error responses must include a JSON structure with exactly these fields: status (HTTP status code), message (user-facing string), error (error code identifier), and timestamp (ISO 8601 timestamp), formatted consistently across all endpoints.

**Validates: Requirements 8.8**

---

## Testing Strategy for Correctness Properties

### Unit Testing Approach

**Property-Based Tests** (using fast-check or similar):
- Property 1: Uniqueness constraint with random emails
- Property 2: Non-reversibility with random passwords
- Property 3: Consistent verification with random passwords and hashes
- Property 4: Identical error messages with randomized credentials
- Property 5-6: Rate limiting with randomized attempts and timeouts
- Property 7-8: JWT expiration and signature with randomized tokens
- Property 11: Token storage format with randomized tokens
- Property 14: Revocation state consistency with randomized tokens
- Property 17: Email normalization with randomized email cases
- Property 18-19: Input validation with randomized invalid inputs

**Example-Based Tests**:
- Property 9: Specific test for missing Authorization header
- Property 10: Specific test for token_type validation
- Property 12: Atomic refresh with transaction rollback scenario
- Property 13: Expiration consistency with specific timestamps
- Property 15: Complete logout with 3-5 active tokens
- Property 16: Logout idempotency with 2-3 sequential calls
- Property 20: Error response structure on various error conditions

### Integration Testing Approach

**End-to-End Scenarios**:
1. **Registration to Logout Flow**: Register → Login → Refresh → Logout → Verify token rejection
2. **Rate Limiting Flow**: 5 failed logins → Account locked → Wait 15 minutes → Successfully login
3. **Token Expiration Flow**: Login → Wait 15+ minutes → Attempt to use expired token → Refresh with refresh token → Use new access token
4. **Concurrent Operations**: Multiple login attempts → Token collision detection → Each gets unique token
5. **Database Consistency**: After server crash during token refresh, verify atomic operations succeeded or failed completely

### Test Execution Configuration

**Minimum 100 iterations per property test** due to randomization:
- Each property test must generate 100+ randomized inputs
- Each iteration must verify the property holds
- Failed iterations must be reported with the specific failing example
- Coverage of edge cases through random generation (empty strings, max lengths, boundary values)

**Tag Format for Test Execution**:
```
Feature: nestjs-auth-system
Property 1: Email uniqueness constraint with random emails
Property 2: Password hash non-reversibility with random passwords
...
```

---

## Module Dependencies and Initialization

```typescript
// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      LoginAttemptEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_PUBLIC_KEY,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '15m',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    TokenService,
    PasswordService,
    RateLimitService,
    AuditService,
    UserRepository,
    RefreshTokenRepository,
    LoginAttemptRepository,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
```

---

## Deployment Considerations

### Database Initialization

```typescript
// src/database/database.module.ts

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'sqlite' as const,
        database: process.env.DATABASE_URL || 'auth.db',
        entities: [UserEntity, RefreshTokenEntity, LoginAttemptEntity],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        migrations: ['src/database/migrations/*.ts'],
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
```

### Environment Configuration

```bash
# Production .env example
NODE_ENV=production
DATABASE_URL=/var/lib/auth/auth.db
JWT_PRIVATE_KEY=<BASE64_ENCODED_PRIVATE_KEY>
JWT_PUBLIC_KEY=<BASE64_ENCODED_PUBLIC_KEY>
JWT_KEY_ID=key-1
FRONTEND_URL=https://app.example.com
CORS_ORIGIN=https://app.example.com
SESSION_SECRET=<RANDOM_32_CHAR_STRING>
LOG_LEVEL=info
```

---

## Summary

This comprehensive design provides:

✅ **Layered Architecture** with clear separation of concerns across HTTP, business logic, and data access layers

✅ **JWT Implementation** with RS256 signing, token rotation, expiration validation, and key management

✅ **Password Security** using bcrypt with salt round 10 and constant-time comparison

✅ **Rate Limiting** with account lockout after 5 failed attempts in 15 minutes

✅ **Database Design** with SQLite schema, proper indexes, and referential integrity

✅ **Error Handling** with custom exceptions, validation pipes, and consistent error responses

✅ **Security Best Practices** including CORS, HTTPS enforcement, environment variable management, and OWASP compliance

✅ **20 Correctness Properties** bridging requirements to machine-verifiable specifications

✅ **Testing Strategy** combining property-based tests and integration tests for comprehensive coverage

✅ **Production-Ready** with TypeORM migrations, comprehensive logging, and deployment configurations
