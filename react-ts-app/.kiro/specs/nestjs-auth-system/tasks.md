# Implementation Plan: NestJS Authentication System

## Overview

This implementation plan breaks down the NestJS authentication system design into discrete coding tasks with incremental progress. Tasks are organized following a layered architecture approach: starting with project setup, progressing through database schema, core entities and repositories, service layer implementation, controller and API endpoints, security infrastructure, and comprehensive testing including property-based testing for all 20 correctness properties.

Each task builds on previous steps, with property-based tests integrated as sub-tasks to validate correctness properties early. The task dependency graph at the end defines wave-based parallel execution for efficient implementation.

---

## Tasks

- [x] 1. Project Setup and Dependencies Installation
  - Initialize NestJS project with TypeScript and necessary build tooling
  - Install core dependencies: @nestjs/core, @nestjs/common, @nestjs/jwt, passport, passport-jwt
  - Install data layer dependencies: @nestjs/typeorm, typeorm, sqlite3, uuid, bcryptjs
  - Install validation dependencies: class-validator, class-transformer
  - Install security dependencies: @nestjs/helmet, cors
  - Install configuration management: @nestjs/config, dotenv
  - Configure TypeScript compiler options (target ES2020, module commonjs, strict mode)
  - Set up tsconfig.json with path aliases for src/, common/, auth/ directories
  - Verify all dependencies are installed correctly with npm/yarn
  - _Requirements: 10.1, 10.2, 10.3, 11.1_

- [x] 2. Project Structure and Module Configuration
  - Create directory structure: src/auth/{controllers,services,guards,strategies,repositories,entities,dtos,exceptions,filters,decorators,config}, src/common/{decorators,exceptions,filters,guards,interceptors,middleware,pipes}, src/database/migrations
  - Create src/app.module.ts as root module
  - Create src/main.ts entry point with NestFactory.create()
  - Configure global middleware and pipes in main.ts
  - Set up environment variable loading with @nestjs/config
  - Create .env template file with placeholder JWT keys and database URL
  - Generate RSA key pair for JWT signing (4096-bit) and encode to BASE64
  - Store JWT keys in .env as JWT_PRIVATE_KEY and JWT_PUBLIC_KEY
  - Configure app.listen() with PORT from environment (default 3001)
  - _Requirements: 10.1, 11.3, 11.4_

- [x] 3. Database Configuration and Initialization
  - [x] 3.1 Configure TypeORM database connection
    - Create src/database/database.module.ts with TypeOrmModule configuration
    - Set type to 'sqlite', database path from DATABASE_URL env variable (default 'auth.db')
    - Enable synchronize: true for development, false for production
    - Enable logging for development mode
    - Set up migrations runner (migrationsRun: true)
    - Configure entities array with UserEntity, RefreshTokenEntity, LoginAttemptEntity
    - _Requirements: 10.1, 10.8_

  - [ ]* 3.2 Write property test for database connection initialization
    - **Property: Database Initialization Consistency**
    - **Validates: Requirements 10.8**

- [x] 4. Core Entity Models and Database Schema
  - [x] 4.1 Implement User entity with TypeORM decorators
    - Create src/auth/entities/user.entity.ts
    - Define UserEntity with @Entity('users') decorator
    - Add columns: userId (TEXT PRIMARY KEY, UUID), email (TEXT UNIQUE NOT NULL), passwordHash (VARCHAR(60) NOT NULL)
    - Add timestamps: createdAt (DATETIME DEFAULT CURRENT_TIMESTAMP), updatedAt (DATETIME DEFAULT CURRENT_TIMESTAMP)
    - Add @CreateDateColumn and @UpdateDateColumn decorators
    - Add @Index('idx_users_email') on email column for O(log n) lookups
    - Add relationship: @OneToMany(() => RefreshTokenEntity, token => token.user) with cascade: ['remove']
    - Verify entity structure matches design document
    - _Requirements: 1.5, 10.1_

  - [x] 4.2 Implement RefreshToken entity with TypeORM decorators
    - Create src/auth/entities/refresh-token.entity.ts
    - Define RefreshTokenEntity with @Entity('refresh_tokens') decorator
    - Add columns: tokenId (TEXT PRIMARY KEY), userId (TEXT FOREIGN KEY), tokenHash (VARCHAR(60) NOT NULL)
    - Add timestamps: issuedAt (DATETIME NOT NULL), expiresAt (DATETIME NOT NULL)
    - Add revoked (BOOLEAN DEFAULT 0) column
    - Add system timestamps: createdAt, updatedAt
    - Add @ManyToOne relationship with @JoinColumn to UserEntity (onDelete: 'CASCADE')
    - Add indexes: idx_refresh_tokens_user_id, idx_refresh_tokens_revoked
    - Verify entity structure matches design document
    - _Requirements: 4.3, 4.5, 10.2_

  - [x] 4.3 Implement LoginAttempt entity for rate limiting
    - Create src/auth/entities/login-attempt.entity.ts
    - Define LoginAttemptEntity with @Entity('login_attempts') decorator
    - Add columns: attemptId (TEXT PRIMARY KEY), email (TEXT NOT NULL), success (BOOLEAN NOT NULL)
    - Add timestamp: timestamp (DATETIME DEFAULT CURRENT_TIMESTAMP)
    - Add indexes: idx_login_attempts_email, idx_login_attempts_timestamp
    - Verify entity structure matches design document
    - _Requirements: 10.3, 11.6_

  - [ ]* 4.4 Write property test for entity schema consistency
    - **Property 2: Password Hash Non-reversibility**
    - **Validates: Requirements 1.4, 7.1, 7.5**

- [x] 5. Repository Layer Implementation
  - [x] 5.1 Implement UserRepository with custom queries
    - Create src/auth/repositories/user.repository.ts
    - Extend Repository<UserEntity> with @EntityRepository decorator
    - Implement findByEmail(email: string): Promise<UserEntity | null> method with email lookup
    - Implement findById(userId: string): Promise<UserEntity | null> method
    - Implement create(email: string, passwordHash: string): Promise<UserEntity> method
    - Implement checkEmailExists(email: string): Promise<boolean> method
    - Use parameterized queries to prevent SQL injection
    - _Requirements: 1.5, 10.1, 11.2_

  - [x] 5.2 Implement RefreshTokenRepository
    - Create src/auth/repositories/refresh-token.repository.ts
    - Extend Repository<RefreshTokenEntity> with @EntityRepository decorator
    - Implement create(token: RefreshTokenEntity): Promise<RefreshTokenEntity> method
    - Implement findByUserIdAndHash(userId: string, tokenHash: string): Promise<RefreshTokenEntity | null> method
    - Implement findActiveByUserId(userId: string): Promise<RefreshTokenEntity[]> method (where revoked = false)
    - Implement update(tokenId: string, updates: Partial<RefreshTokenEntity>): Promise<void> method
    - Implement revokeAllByUserId(userId: string): Promise<void> method
    - Use transactions for atomic updates
    - _Requirements: 4.3, 5.7, 10.2_

  - [x] 5.3 Implement LoginAttemptRepository
    - Create src/auth/repositories/login-attempt.repository.ts
    - Extend Repository<LoginAttemptEntity> with @EntityRepository decorator
    - Implement create(attempt: LoginAttemptEntity): Promise<LoginAttemptEntity> method
    - Implement countFailedAttempts(email: string, since: Date): Promise<number> method (where success = false AND timestamp >= since)
    - Implement deleteOlderThan(date: Date): Promise<void> method for cleanup
    - Implement deleteByEmail(email: string): Promise<void> method to clear attempts on success
    - Use indexes for efficient queries on high-volume data
    - _Requirements: 10.3, 11.6_

  - [ ]* 5.4 Write property test for repository query correctness
    - **Property 1: Email Uniqueness Constraint**
    - **Validates: Requirements 1.3**

- [x] 6. Password Hashing Service
  - [x] 6.1 Implement PasswordService with bcrypt hashing
    - Create src/auth/services/password.service.ts
    - Implement @Injectable() PasswordService class
    - Implement hashPassword(password: string): Promise<string> using bcrypt.hash(password, 10)
    - Implement verifyPassword(password: string, hash: string): Promise<boolean> using bcrypt.compare()
    - Implement isValidPasswordHash(hash: string): boolean to validate "$2b$" prefix
    - Ensure constant-time comparison in verify function (bcrypt.compare provides this)
    - Add error handling for bcrypt errors
    - Add console warnings if hash generation takes unusually long
    - _Requirements: 1.4, 7.1, 7.3, 7.8_

  - [ ]* 6.2 Write property test for password hashing correctness
    - **Property 2: Password Hash Non-reversibility**
    - **Validates: Requirements 1.4, 7.1, 7.5**

  - [ ]* 6.3 Write property test for password verification consistency
    - **Property 3: Identical Password Verification Consistency**
    - **Validates: Requirements 2.2, 7.3, 7.8**

- [x] 7. Token Service Implementation
  - [x] 7.1 Implement TokenService with RS256 JWT generation
    - Create src/auth/services/token.service.ts
    - Implement @Injectable() TokenService class with JwtService and RefreshTokenRepository injection
    - Load RSA private and public keys from environment variables
    - Implement generateTokenPair(userId: string): Promise<{accessToken, refreshToken}> method
      - Generate AccessToken with payload: userId, tokenType: "access", iat, exp (900 seconds)
      - Generate RefreshToken with payload: userId, tokenType: "refresh", iat, exp (604800 seconds)
      - Sign both tokens with RS256 using JwtService.sign() with privateKey
      - Add kid (key identifier) header to both tokens
      - Hash RefreshToken with bcrypt and store hash in database
    - Set accessTokenExpiration = 900 (15 minutes in seconds)
    - Set refreshTokenExpiration = 604800 (7 days in seconds)
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3_

  - [x] 7.2 Implement token verification methods in TokenService
    - Implement verifyAccessToken(token: string): Promise<TokenPayload> method
      - Verify JWT signature with RS256 public key
      - Check token_type = "access"
      - Handle TokenExpiredError with "Access token expired" message
      - Handle JsonWebTokenError with "Invalid token" message
      - Return decoded TokenPayload on success
    - Implement verifyRefreshToken(token: string): Promise<TokenPayload> method
      - Verify JWT signature with RS256 public key
      - Check token_type = "refresh"
      - Handle TokenExpiredError with "Refresh token expired" message
      - Handle JsonWebTokenError with "Invalid token" message
      - Return decoded TokenPayload on success
    - Add error context and stack traces for debugging
    - _Requirements: 3.5, 3.6, 3.7, 4.2, 5.6_

  - [x] 7.3 Implement refresh token storage and revocation
    - Implement getStoredRefreshToken(userId: string, token: string): Promise<RefreshTokenEntity | null> method
      - Hash the provided token with bcrypt
      - Query database for matching token_hash and user_id
      - Return stored token record or null
    - Implement revokeRefreshToken(tokenId: string): Promise<void> method
      - Update token record with revoked = true
      - Update updatedAt timestamp
    - Implement revokeAllRefreshTokens(userId: string): Promise<void> method
      - Update all non-revoked tokens for user with revoked = true in single transaction
    - Implement getActiveRefreshTokens(userId: string): Promise<RefreshTokenEntity[]> method
      - Query all tokens with revoked = false for user
    - Implement private hashToken(token: string): Promise<string> helper
    - _Requirements: 4.3, 4.5, 5.7, 6.2, 6.3_

  - [ ]* 7.4 Write property test for JWT expiration precision
    - **Property 7: JWT Access Token Expiration Precision**
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 7.5 Write property test for JWT signature verification
    - **Property 8: JWT Signature Verification**
    - **Validates: Requirements 3.7**

  - [ ]* 7.6 Write property test for token type validation
    - **Property 10: Token Type Validation**
    - **Validates: Requirements 3.2, 4.2**

  - [ ]* 7.7 Write property test for refresh token storage security
    - **Property 11: Refresh Token Storage Security**
    - **Validates: Requirements 4.3, 4.5**

  - [ ]* 7.8 Write property test for refresh token expiration consistency
    - **Property 13: Refresh Token Expiration Consistency**
    - **Validates: Requirements 4.3**

- [x] 8. Rate Limiting Service
  - [x] 8.1 Implement RateLimitService for account lockout
    - Create src/auth/services/rate-limit.service.ts
    - Implement @Injectable() RateLimitService class with LoginAttemptRepository injection
    - Set maxFailedAttempts = 5
    - Set lockoutWindow = 15 * 60 * 1000 (900000 milliseconds)
    - Implement recordFailedAttempt(email: string): Promise<void> method
      - Normalize email to lowercase
      - Create LoginAttempt record with success = false
      - Delete attempts older than lockoutWindow from database (cleanup)
    - Implement isAccountLocked(email: string): Promise<boolean> method
      - Count failed attempts for email in last 15 minutes
      - Return true if count >= maxFailedAttempts
    - Implement clearFailedAttempts(email: string): Promise<void> method
      - Delete all LoginAttempt records for email
    - Implement recordSuccessfulAttempt(email: string): Promise<void> method (for audit logging)
    - _Requirements: 2.9, 11.6_

  - [ ]* 8.2 Write property test for rate limiting correctness
    - **Property 5: Failed Login Attempt Tracking**
    - **Validates: Requirements 2.9, 11.6**

  - [ ]* 8.3 Write property test for rate limit clearing on success
    - **Property 6: Successful Login Clears Rate Limit**
    - **Validates: Requirements 2.9, 11.6**

- [x] 9. Audit Service Implementation
  - [x] 9.1 Implement AuditService for comprehensive logging
    - Create src/auth/services/audit.service.ts
    - Implement @Injectable() AuditService class
    - Implement logEvent(eventType: string, details: Record<string, any>): Promise<void> method
      - Accept eventType: 'user_registered', 'login_success', 'login_failed', 'token_refreshed', 'logout_success'
      - Accept details object with userId, email, reason, etc.
      - Log to console with timestamp, event type, and details
      - Include ISO 8601 timestamp in all logs
      - Never log passwords or sensitive data
      - Use logger.log, logger.warn, logger.error appropriately
    - Implement getAuditLog(filters?: any): Promise<AuditLogEntry[]> method (stubbed for now)
    - Add context information: request ID, user agent (if available)
    - _Requirements: 2.8, 6.7, 11.8_

- [x] 10. Authentication Service - Registration Flow
  - [x] 10.1 Implement register() method in AuthService
    - Create src/auth/services/auth.service.ts
    - Implement @Injectable() AuthService class with service injections (UserService, TokenService, PasswordService, RateLimitService, AuditService)
    - Implement register(registerDto: RegisterDto): Promise<AuthResponseDto> method
      - Validate email format with RFC 5322 regex
      - Validate password with regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (@$!%*?&)
      - Check email length not exceeding 128 characters
      - Check password length not exceeding 128 characters
      - Throw BadRequestException if validation fails
      - Check if email already exists via UserService
      - Throw ConflictException('Email already registered') if exists
      - Hash password using PasswordService.hashPassword()
      - Create user with email.toLowerCase() and password hash via UserService
      - Log event 'user_registered' with userId and email
      - Return response: {userId, email, createdAt}
    - Implement private validateRegisterInput(dto: RegisterDto): void method with comprehensive validation
    - Implement private isValidEmail(email: string): boolean method
    - Implement private isValidPassword(password: string): boolean method
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 8.2_

  - [ ]* 10.2 Write property test for email uniqueness
    - **Property 1: Email Uniqueness Constraint**
    - **Validates: Requirements 1.3**

  - [ ]* 10.3 Write property test for email normalization
    - **Property 17: Email Lowercase Normalization**
    - **Validates: Requirements 1.5**

  - [ ]* 10.4 Write property test for input validation
    - **Property 18: Input Validation Completeness**
    - **Validates: Requirements 1.7, 1.8, 2.6, 2.7, 8.10**

- [x] 11. Authentication Service - Login Flow
  - [x] 11.1 Implement login() method in AuthService
    - Implement login(loginDto: LoginDto): Promise<AuthResponseDto> method
      - Normalize email to lowercase
      - Check rate limiting via RateLimitService.isAccountLocked()
      - Throw TooManyRequestsException if account locked
      - Retrieve user via UserService.findByEmail(email)
      - If user not found, record failed attempt, log event, throw UnauthorizedException('Invalid email or password')
      - Verify password via PasswordService.verifyPassword()
      - If password invalid, record failed attempt, log event, throw UnauthorizedException('Invalid email or password')
      - Generate token pair via TokenService.generateTokenPair()
      - Clear failed attempts via RateLimitService.clearFailedAttempts()
      - Log event 'login_success' with userId and email
      - Return response: {accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900}
    - Error handling: catch and re-throw after cleanup
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 11.2 Write property test for login credential neutrality
    - **Property 4: Login Credential Neutrality**
    - **Validates: Requirements 2.4, 2.5, 11.7**

  - [ ]* 11.3 Write property test for rate limit tracking
    - **Property 5: Failed Login Attempt Tracking**
    - **Validates: Requirements 2.9, 11.6**

- [x] 12. Authentication Service - Token Refresh Flow
  - [x] 12.1 Implement refreshToken() method in AuthService
    - Implement refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> method
      - Validate token format: check 3 parts separated by dots
      - Throw BadRequestException('Invalid token format') if format invalid
      - Decode and verify refresh token via TokenService.verifyRefreshToken()
      - Get stored token via TokenService.getStoredRefreshToken()
      - Check if stored token is null or revoked
      - Throw UnauthorizedException('Refresh token has been revoked') if revoked/null
      - Generate new token pair via TokenService.generateTokenPair()
      - Revoke old refresh token via TokenService.revokeRefreshToken()
      - Log event 'token_refreshed' with userId
      - Return response: {accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900}
    - Implement private isValidJwtFormat(token: string): boolean helper
    - Error handling with proper exception mapping
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [ ]* 12.2 Write property test for token refresh atomicity
    - **Property 12: Refresh Token Atomic Rotation**
    - **Validates: Requirements 5.7, 5.3**

  - [ ]* 12.3 Write property test for revoked token rejection
    - **Property 14: Revoked Token Rejection**
    - **Validates: Requirements 5.3, 6.8**

- [x] 13. Authentication Service - Logout Flow
  - [x] 13.1 Implement logout() method in AuthService
    - Implement logout(userId: string): Promise<void> method
      - Retrieve all active refresh tokens via TokenService.getActiveRefreshTokens()
      - Revoke all tokens via TokenService.revokeAllRefreshTokens() in single transaction
      - Log event 'logout_success' with userId and token count
    - Ensure atomic transaction: all tokens revoked or none revoked
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 13.2 Write property test for complete logout revocation
    - **Property 15: Complete Logout Revocation**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 13.3 Write property test for logout idempotency
    - **Property 16: Logout Idempotency**
    - **Validates: Requirements 6.4**

- [x] 14. User Service Implementation
  - [x] 14.1 Implement UserService with CRUD operations
    - Create src/auth/services/user.service.ts
    - Implement @Injectable() UserService class with UserRepository injection
    - Implement create(email: string, passwordHash: string): Promise<UserEntity> method
      - Generate UUID for userId
      - Create user record with userId, email, passwordHash, createdAt, updatedAt
      - Use repository to persist
    - Implement findByEmail(email: string): Promise<UserEntity | null> method
      - Query by email (normalized to lowercase)
    - Implement findById(userId: string): Promise<UserEntity | null> method
      - Query by userId
    - Implement exists(email: string): Promise<boolean> method
    - Add error handling for database errors
    - _Requirements: 1.5, 2.1, 10.1_

- [x] 15. Data Transfer Objects (DTOs) and Validation
  - [x] 15.1 Create RegisterDto with class-validator decorators
    - Create src/auth/dtos/register.dto.ts
    - Export RegisterDto class with properties:
      - email: @IsEmail(), @IsNotEmpty()
      - password: @IsString(), @IsNotEmpty(), @MinLength(8), @MaxLength(128)
    - _Requirements: 8.1, 8.2, 8.10_

  - [x] 15.2 Create LoginDto with validation
    - Create src/auth/dtos/login.dto.ts
    - Export LoginDto class with properties:
      - email: @IsEmail(), @IsNotEmpty()
      - password: @IsString(), @IsNotEmpty()
    - _Requirements: 2.6, 2.7_

  - [x] 15.3 Create RefreshTokenDto
    - Create src/auth/dtos/refresh-token.dto.ts
    - Export RefreshTokenDto class with properties:
      - refreshToken: @IsJWT(), @IsNotEmpty()
    - _Requirements: 5.9_

  - [x] 15.4 Create AuthResponseDto
    - Create src/auth/dtos/auth-response.dto.ts
    - Export AuthResponseDto class with optional properties:
      - userId, email, createdAt (for registration response)
      - accessToken, refreshToken, tokenType, expiresIn (for login/refresh response)
    - _Requirements: 1.6, 2.3, 5.8_

  - [x] 15.5 Create ErrorResponseDto
    - Create src/auth/dtos/error-response.dto.ts
    - Export ErrorResponseDto class with properties:
      - status: number
      - message: string
      - error: string (error code)
      - timestamp: string (ISO 8601)
      - details?: Record<string, any>
    - _Requirements: 8.8_

- [x] 16. Custom Exceptions and Error Handling
  - [x] 16.1 Create custom exception classes
    - Create src/auth/exceptions/auth.exception.ts
    - Export AuthException base class extending HttpException
      - Properties: message, statusCode, errorCode, details
    - Export InvalidCredentialsException
    - Export AccountLockedException
    - Export EmailAlreadyExistsException
    - Export TokenExpiredException
    - Export InvalidTokenException
    - _Requirements: 8.3, 8.5, 8.6, 8.7_

  - [x] 16.2 Create auth exception filter
    - Create src/auth/filters/auth-exception.filter.ts
    - Implement @Catch(HttpException, AuthException) filter
    - Extract status, message, errorCode from exception
    - Return consistent ErrorResponseDto with timestamp
    - _Requirements: 8.8_

- [x] 17. Authentication Guards and Strategies
  - [x] 17.1 Implement JwtStrategy (Passport strategy)
    - Create src/auth/strategies/jwt.strategy.ts
    - Extend PassportStrategy(Strategy)
    - Load JWT public key from ConfigService
    - Configure ExtractJwt.fromAuthHeaderAsBearerToken()
    - Set algorithms: ['RS256']
    - Implement validate(payload: TokenPayload): Promise<TokenPayload> method
      - Verify payload.tokenType = 'access'
      - Verify user exists via UserService
      - Return payload on success
      - Throw UnauthorizedException on failure
    - Add proper error handling and logging
    - _Requirements: 3.1, 3.8_

  - [x] 17.2 Implement JwtAuthGuard
    - Create src/auth/guards/jwt-auth.guard.ts
    - Extend AuthGuard('jwt')
    - Implement canActivate() to check Authorization header
      - Throw UnauthorizedException('Authorization header missing') if missing
      - Call super.canActivate()
    - Implement handleRequest() to handle errors
      - Map TokenExpiredError to 'Access token expired'
      - Map JsonWebTokenError to 'Invalid token'
      - Throw UnauthorizedException on missing user
    - _Requirements: 3.5, 3.6, 3.7, 3.8_

  - [ ]* 17.3 Write property test for missing authorization header
    - **Property 9: Access Token Missing Header Rejection**
    - **Validates: Requirements 3.8**

- [x] 18. Authentication Controller Implementation
  - [x] 18.1 Implement AuthController with endpoints
    - Create src/auth/controllers/auth.controller.ts
    - Implement @Controller('api/auth') class
    - Apply @UseFilters(AuthExceptionFilter) globally
    - Implement @Post('register') endpoint
      - Accept RegisterDto
      - Return HTTP 201 Created with AuthResponseDto
      - Delegate to AuthService.register()
    - Implement @Post('login') endpoint
      - Accept LoginDto
      - Return HTTP 200 OK with AuthResponseDto
      - Delegate to AuthService.login()
    - Implement @Post('refresh') endpoint
      - Accept RefreshTokenDto
      - Return HTTP 200 OK with AuthResponseDto
      - Delegate to AuthService.refreshToken()
    - Implement @Post('logout') endpoint
      - Apply @UseGuards(JwtAuthGuard)
      - Accept @CurrentUser() decorator to extract user
      - Return HTTP 200 OK with {message: "Logout successful"}
      - Delegate to AuthService.logout()
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 18.2 Write integration test for register endpoint
    - Test valid registration returns HTTP 201
    - Test duplicate email returns HTTP 409
    - Test invalid email returns HTTP 400
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ]* 18.3 Write integration test for login endpoint
    - Test valid login returns HTTP 200 with tokens
    - Test invalid credentials returns HTTP 401
    - Test locked account returns HTTP 429
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.9_

  - [ ]* 18.4 Write integration test for refresh endpoint
    - Test valid refresh returns HTTP 200 with new tokens
    - Test expired token returns HTTP 401
    - Test revoked token returns HTTP 401
    - _Requirements: 5.1, 5.6, 5.7, 5.8_

  - [ ]* 18.5 Write integration test for logout endpoint
    - Test valid logout returns HTTP 200
    - Test missing authorization header returns HTTP 401
    - Test refresh with revoked token returns HTTP 401
    - _Requirements: 6.3, 6.4, 6.8_

- [x] 19. CurrentUser Decorator and Interceptors
  - [x] 19.1 Create @CurrentUser() decorator
    - Create src/auth/decorators/current-user.decorator.ts
    - Export CurrentUser decorator using createParamDecorator
    - Extract user from request object (set by JwtAuthGuard)
    - Return TokenPayload
    - _Requirements: 6.1_

  - [x] 19.2 Create auth response interceptor
    - Create src/auth/interceptors/auth-response.interceptor.ts
    - Implement @UseInterceptors(AuthResponseInterceptor)
    - Wrap response in consistent format: {status, message, data, timestamp}
    - Ensure all responses have this structure
    - _Requirements: 9.5, 9.6_

- [x] 20. Validation Pipes and Middleware
  - [x] 20.1 Create custom validation pipe
    - Create src/auth/pipes/auth-validation.pipe.ts
    - Implement PipeTransform with custom validation logic
    - Check request body not empty
    - Check payload size < 1 MB
    - Trim all string fields
    - Validate using class-validator
    - Format and return validation errors with field names
    - _Requirements: 1.9, 8.2, 8.9_

  - [x] 20.2 Create and apply global validation pipe
    - Add app.useGlobalPipes(new ValidationPipe()) in main.ts
    - Configure for auto-transformation: true
    - Configure for forbidNonWhitelisted: true
    - _Requirements: 8.2, 8.9_

  - [x] 20.3 Create rate limiting middleware
    - Create src/common/middleware/rate-limit.middleware.ts
    - Implement middleware to track requests by IP
    - Allow max 10 requests per minute per IP on auth endpoints
    - Return HTTP 429 if limit exceeded
    - Use in-memory store for tracking (or Redis for production)
    - _Requirements: 11.5_

- [x] 21. Auth Module Assembly
  - [x] 21.1 Create auth.module.ts with complete module configuration
    - Create src/auth/auth.module.ts
    - Import TypeOrmModule with entities: UserEntity, RefreshTokenEntity, LoginAttemptEntity
    - Import PassportModule with strategy: 'jwt'
    - Import JwtModule with configuration
      - Set sign options: algorithm 'RS256', expiresIn '15m'
    - Register repositories: UserRepository, RefreshTokenRepository, LoginAttemptRepository
    - Register services: AuthService, UserService, TokenService, PasswordService, RateLimitService, AuditService
    - Register strategies: JwtStrategy
    - Register guards: JwtAuthGuard
    - Register controller: AuthController
    - Export: AuthService, JwtAuthGuard for use in other modules
    - _Requirements: 3.1, 3.8_

- [ ] 22. Security Configuration - CORS and HTTPS
  - [x] 22.1 Configure CORS in main.ts
    - Enable CORS with specific origin from FRONTEND_URL environment variable
    - Set credentials: true for cookie support
    - Set methods: ['GET', 'POST', 'PUT', 'DELETE']
    - Set allowedHeaders: ['Content-Type', 'Authorization']
    - Set exposedHeaders: ['Content-Length', 'X-Request-Id']
    - Set maxAge: 3600
    - _Requirements: 11.2_

  - [x] 22.2 Configure security headers middleware
    - Add helmet() middleware to app in main.ts
    - Enables X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection headers
    - _Requirements: 11.1_

  - [x] 22.3 Implement HTTPS enforcement in production
    - Add middleware to redirect HTTP to HTTPS in production
    - Check x-forwarded-proto header for proxy environments
    - Return 301 redirect to https:// URL
    - _Requirements: 11.1, 11.2_

- [ ] 23. Environment Configuration and Secrets
  - [~] 23.1 Create .env template file
    - Create .env.example (template, not to be committed)
    - Include placeholders for:
      - NODE_ENV (default: development)
      - DATABASE_URL (default: file:./auth.db)
      - JWT_PRIVATE_KEY (BASE64 encoded)
      - JWT_PUBLIC_KEY (BASE64 encoded)
      - JWT_KEY_ID (default: key-1)
      - FRONTEND_URL (default: http://localhost:3000)
      - CORS_ORIGIN (same as FRONTEND_URL)
      - SESSION_SECRET (random 32 chars)
      - LOG_LEVEL (default: info)
    - _Requirements: 11.3, 11.4_

  - [~] 23.2 Create configuration validation
    - Implement validation that all required environment variables are set at startup
    - Throw error if JWT keys, DATABASE_URL, or FRONTEND_URL missing
    - _Requirements: 11.3, 11.4_

- [x] 24. Database Migrations
  - [x] 24.1 Create initial database migration
    - Create src/database/migrations/1_initial_schema.ts
    - Define MigrationInterface with up() and down() methods
    - Create users table with all columns and indexes
    - Create refresh_tokens table with foreign key to users
    - Create login_attempts table with indexes
    - Verify migration can run and rollback successfully
    - _Requirements: 10.1, 10.2, 10.3, 10.7, 10.8_

- [ ] 25. Comprehensive Property-Based Testing
  - [~] 25.1 Set up property-based testing framework
    - Install fast-check library for property-based testing
    - Create src/auth/tests directory structure
    - Configure test runner to execute property tests with minimum 100 iterations
    - _Requirements: All correctness properties_

  - [~] 25.2 Implement property tests for correctness properties
    - All property tests from Requirements covered in tasks 6-13, 17-18
    - Properties 1-20 each have dedicated test sub-tasks
    - Each property test must run minimum 100 iterations with randomized inputs
    - Each iteration must verify the property holds
    - Failed iterations must report the specific counterexample
    - _Requirements: All correctness properties_

- [ ] 26. Integration Testing
  - [~] 26.1 Write end-to-end registration to logout flow test
    - Register new user → Login → Refresh token → Logout → Verify token rejection
    - Verify each step returns expected HTTP status and response structure
    - _Requirements: 1.6, 2.3, 5.8, 6.4_

  - [~] 26.2 Write rate limiting flow test
    - Submit 5 failed login attempts → Verify account locked (HTTP 429)
    - Wait 15+ minutes → Verify account unlocked
    - Submit successful login → Verify rate limit cleared
    - _Requirements: 2.9, 11.6_

  - [~] 26.3 Write token expiration and refresh flow test
    - Login → Wait until access token expires → Attempt API call (HTTP 401)
    - Use refresh token to get new access token → Verify successful
    - Use old refresh token again → Verify rejection (rotated)
    - _Requirements: 3.5, 3.6, 5.2, 5.7_

  - [~] 26.4 Write database consistency test
    - Verify user records persist after server restart
    - Verify refresh token revocation persists
    - Verify audit log entries persisted
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 27. Error Handling and Edge Cases
  - [~] 27.1 Test malformed JSON error handling
    - Send invalid JSON to endpoints
    - Verify HTTP 400 with "Invalid JSON format" message
    - _Requirements: 8.1_

  - [~] 27.2 Test constraint violation handling
    - Insert duplicate user email
    - Verify HTTP 409 Conflict with proper error message
    - _Requirements: 8.5_

  - [~] 27.3 Test database connection error handling
    - Simulate database unavailability
    - Verify HTTP 503 Service Unavailable
    - _Requirements: 8.6_

  - [~] 27.4 Test unexpected error handling
    - Trigger unexpected error condition
    - Verify HTTP 500 with generic message (no details)
    - Verify error logged with full stack trace
    - _Requirements: 8.7_

- [~] 28. Checkpoint - All unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 29. Documentation and API Specification
  - [~] 29.1 Generate OpenAPI/Swagger documentation
    - Install @nestjs/swagger and swagger-ui-express
    - Decorate controller and endpoints with @ApiOperation, @ApiResponse, @ApiParam
    - Generate Swagger JSON at /api/docs-json
    - Expose Swagger UI at /api/docs
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [~] 29.2 Write API integration guide for frontend
    - Document each endpoint: URL, method, request body, response format
    - Include example requests and responses
    - Document error responses and status codes
    - Include JWT token handling instructions
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 30. Security Audit and Compliance Verification
  - [~] 30.1 Verify OWASP Top 10 compliance
    - Verify no SQL injection vulnerabilities (parameterized queries)
    - Verify strong authentication (JWT + bcrypt)
    - Verify no sensitive data in responses
    - Verify access control on protected endpoints
    - Verify input validation on all endpoints
    - Verify error messages don't leak system details
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [~] 30.2 Verify password security compliance
    - Verify bcrypt hashing with salt round 10
    - Verify no plaintext passwords in logs or responses
    - Verify password field validation (8+ chars, mixed case, digit, special char)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [~] 30.3 Verify JWT security compliance
    - Verify RS256 signing (not HS256)
    - Verify private key stored in environment (not hardcoded)
    - Verify token expiration validation
    - Verify token signature validation
    - Verify token_type claim validation
    - _Requirements: 3.1, 3.3, 3.5, 3.7, 11.3, 11.4_

- [~] 31. Final Checkpoint - All tests pass and security verified
  - Ensure all tests pass and no security issues, ask the user if questions arise.

- [ ] 32. Performance and Load Testing
  - [ ]* 32.1 Write load test for registration endpoint
    - Simulate 100 concurrent registration requests
    - Measure response time and throughput
    - Verify no errors under load
    - _Requirements: 1.1_

  - [ ]* 32.2 Write load test for login endpoint
    - Simulate 100 concurrent login requests
    - Measure response time and verify rate limiting works
    - Verify account lockout prevents abuse
    - _Requirements: 2.1, 11.5, 11.6_

  - [ ]* 32.3 Write load test for token refresh endpoint
    - Simulate 100 concurrent refresh requests
    - Measure token generation performance
    - Verify database consistency under load
    - _Requirements: 5.1_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- All property-based test sub-tasks run minimum 100 iterations with randomized inputs
- Each task references specific requirements for traceability
- Core implementation tasks (without `*`) are required and must be completed
- Testing tasks (with `*`) are recommended but can be deferred for MVP
- Optional performance tests can be added after MVP for production optimization
- Database migrations should run automatically on application startup
- JWT keys should be generated before first deployment and stored securely

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "2.1", "2.2", "23.1"]
    },
    {
      "id": 1,
      "tasks": ["3.1", "4.1", "4.2", "4.3"]
    },
    {
      "id": 2,
      "tasks": ["5.1", "5.2", "5.3", "6.1", "8.1", "9.1"]
    },
    {
      "id": 3,
      "tasks": ["7.1", "7.2", "7.3", "14.1"]
    },
    {
      "id": 4,
      "tasks": ["10.1", "11.1", "12.1", "13.1"]
    },
    {
      "id": 5,
      "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "16.1", "16.2"]
    },
    {
      "id": 6,
      "tasks": ["17.1", "17.2", "19.1", "19.2", "20.1", "20.2", "20.3"]
    },
    {
      "id": 7,
      "tasks": ["18.1", "21.1", "22.1", "22.2", "22.3"]
    },
    {
      "id": 8,
      "tasks": ["24.1", "25.1", "25.2"]
    },
    {
      "id": 9,
      "tasks": ["26.1", "26.2", "26.3", "26.4", "27.1", "27.2", "27.3", "27.4"]
    },
    {
      "id": 10,
      "tasks": ["29.1", "29.2", "30.1", "30.2", "30.3"]
    },
    {
      "id": 11,
      "tasks": ["32.1", "32.2", "32.3"]
    }
  ]
}
```

---

## Verification Checklist

- [~] All 20 correctness properties have corresponding property-based tests
- [~] All property-based tests run minimum 100 iterations
- [~] All required tasks complete without `*` postfix
- [~] Optional tasks marked with `*` can be skipped
- [~] Task dependency graph shows proper wave structure
- [~] All requirements 1-11 are covered by implementation tasks
- [~] Core services: AuthService, TokenService, PasswordService, RateLimitService working
- [~] All 4 API endpoints implemented: register, login, refresh, logout
- [~] JWT RS256 signing and verification working
- [~] Bcrypt password hashing with salt round 10 working
- [~] Rate limiting and account lockout working
- [~] Database schema created with proper indexes
- [~] Error handling with consistent response format
- [~] Security headers (CORS, HTTPS, helmet) configured
- [~] All tests passing
- [~] No security vulnerabilities identified
