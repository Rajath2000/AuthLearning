# JWT Authentication System Implementation Tasks

This document outlines the implementation tasks for verifying and testing the JWT authentication system in the NestJS backend. The system includes:
- JWT token generation with RS256
- Passport JWT strategy for token validation
- User validation through UserService
- Base64-encoded key management

## Implementation Plan

### Phase 1: Verification & Build

- [ ] 1. Verify Environment Configuration
  - Check `.env` file exists and contains:
    - JWT_PRIVATE_KEY (base64-encoded)
    - JWT_PUBLIC_KEY (base64-encoded)
    - DATABASE_URL=auth.db
    - PORT=3001
  - If `.env` is missing, create from `.env.example` and populate with base64 keys
  - Verify keys exist in project root (private.key, public.key files)
  - _Requirements: Environment setup_

- [ ] 2. Clean Build Environment
  - Remove existing dist directory: `rm -rf dist`
  - Verify TypeScript configuration is correct
  - Check tsconfig.json includes all source files
  - _Requirements: Build preparation_

- [ ] 3. Build Backend
  - Run `npm run build`
  - Verify compilation succeeds with no TypeScript errors
  - Check dist directory is created with compiled JavaScript
  - Confirm all source files are properly compiled
  - _Requirements: Build verification_

### Phase 2: Server Startup & Configuration Verification

- [ ] 4. Start Backend Server
  - Run `npm run start`
  - Verify server starts without errors on port 3001
  - Look for messages indicating:
    - "Listening on port 3001" or similar
    - No JWT_PUBLIC_KEY errors
    - No JWT_PRIVATE_KEY errors
    - Database connection initialized
    - Auth module loaded successfully
  - **CRITICAL**: Do NOT use `npm run dev` - use `npm run start` with pre-built dist
  - Verify server remains running (use separate terminal if needed)
  - _Requirements: Server startup validation_

- [ ] 5. Verify JWT Configuration
  - Check server logs for initialization messages
  - Confirm no "JWT_PUBLIC_KEY" or "JWT_PRIVATE_KEY" environment variable errors
  - Verify base64 decoding is working (no base64 decode errors in logs)
  - Check that Passport JWT strategy is registered
  - _Requirements: JWT configuration verification_

### Phase 3: Authentication Flow Testing

- [ ] 6. Test User Registration
  - Create a new user via POST /auth/register
  - Request body:
    ```json
    {
      "email": "test@example.com",
      "password": "TestPassword123!",
      "firstName": "Test",
      "lastName": "User"
    }
    ```
  - Verify response contains:
    - userId (UUID format)
    - email matches input
    - accessToken (JWT format)
    - refreshToken (JWT format)
    - No plain-text passwords in response
  - Store accessToken for next steps
  - _Requirements: User registration validation_

- [ ] 7. Test User Login
  - Login with registered credentials via POST /auth/login
  - Request body:
    ```json
    {
      "email": "test@example.com",
      "password": "TestPassword123!"
    }
    ```
  - Verify response contains:
    - userId
    - accessToken (valid JWT)
    - refreshToken (valid JWT)
    - Token format matches RS256 signature (3 parts separated by dots)
  - Store accessToken for protected endpoint testing
  - _Requirements: Login flow validation_

- [ ] 8. Test Protected Endpoint with Valid Token
  - Use accessToken from login step
  - Call a protected endpoint (e.g., GET /auth/me or similar)
  - Authorization header: `Bearer {accessToken}`
  - Verify response:
    - Returns user data successfully
    - HTTP 200 status code
    - No UnauthorizedException thrown
  - _Requirements: Protected endpoint access_

- [ ] 9. Test Token Validation - Invalid Token
  - Call protected endpoint with malformed token
  - Authorization header: `Bearer invalidtoken123`
  - Verify response:
    - HTTP 401 Unauthorized
    - Error message indicates invalid token
    - Exception type is UnauthorizedException
  - _Requirements: Invalid token rejection_

- [ ] 10. Test Token Validation - Missing Token
  - Call protected endpoint WITHOUT Authorization header
  - Verify response:
    - HTTP 401 Unauthorized
    - Error indicates missing credentials or bearer token
  - _Requirements: Missing token rejection_

- [ ] 11. Test Token Validation - Expired Token
  - Wait for token to expire (or manually manipulate expiration in test)
  - Call protected endpoint with expired token
  - Authorization header: `Bearer {expiredToken}`
  - Verify response:
    - HTTP 401 Unauthorized
    - Error indicates token expired
  - _Requirements: Expired token rejection_

- [ ] 12. Test User Validation in Passport
  - Verify that when token is valid but user no longer exists:
    - Call protected endpoint with valid-formatted token for non-existent user
    - OR delete user and attempt to use their token
  - Verify response:
    - HTTP 401 Unauthorized
    - Error message indicates "User not found" (from UserService.findById)
  - _Requirements: User validation in strategy_

### Phase 4: Verification Checkpoint

- [ ] 13. Final Verification Checklist
  - [ ] Server running without errors on port 3001
  - [ ] User registration succeeds with valid credentials
  - [ ] User login returns valid JWT tokens
  - [ ] Protected endpoints accessible with valid Bearer token
  - [ ] Protected endpoints reject invalid/missing/expired tokens
  - [ ] User validation works (deleted users cannot use old tokens)
  - [ ] All error messages are clear and appropriate
  - [ ] No corrupted JWT characters in tokens
  - [ ] Base64 key decoding is working correctly
  - [ ] RS256 signature verification is successful
  - All tests from Phase 3 pass consistently
  - _Requirements: Complete system validation_

## Architecture Notes

### JWT Strategy Implementation (jwt.strategy.ts)
- Uses Passport JWT with RS256 algorithm
- Base64-decodes public key from environment variable
- Extracts bearer token from Authorization header
- Validates user exists via UserService.findById()
- Returns TokenPayload on successful validation

### Auth Module Configuration (auth.module.ts)
- JwtModule.registerAsync decodes both public and private keys from base64
- Signs tokens with private key (15-minute expiration)
- Verifies tokens with public key
- Handles missing key errors gracefully

### App Module Configuration (app.module.ts)
- Uses absolute path resolution for .env file
- Enables cache and expandVariables for ConfigModule
- Ensures consistent configuration loading

## Key Environment Variables

```
JWT_PRIVATE_KEY=<base64-encoded RSA private key>
JWT_PUBLIC_KEY=<base64-encoded RSA public key>
DATABASE_URL=auth.db
PORT=3001
```

## Testing Strategy

1. **Verification Phase**: Build and startup without errors
2. **Happy Path**: Register, login, access protected endpoints
3. **Error Cases**: Invalid tokens, missing tokens, expired tokens, missing users
4. **Consistency**: All operations behave reliably across multiple requests
