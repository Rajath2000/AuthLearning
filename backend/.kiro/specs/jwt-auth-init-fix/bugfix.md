# Bugfix Requirements Document: JWT Authentication Initialization Failure

## Introduction

The NestJS backend fails to start with the error "TypeError: JwtStrategy requires a secret or key". This bug occurs at application initialization time when the JwtStrategy constructor attempts to configure the Passport JWT strategy. The root cause is that the JWT_PUBLIC_KEY environment variable (stored as base64-encoded RSA key) is not being properly decoded to PEM format before being passed to the strategy. Additionally, the ConfigModule may not be loading the .env file correctly, and jwt.strategy.ts file has been corrupted from failed write attempts, containing garbage characters that prevent proper strategy initialization.

## Bug Analysis

### Current Behavior (Defect)

The system exhibits the following broken behaviors:

1.1 WHEN the NestJS backend starts initialization THEN the server fails with "TypeError: JwtStrategy requires a secret or key" and does not start listening on port 3001

1.2 WHEN JwtStrategy constructor executes during app initialization THEN it receives JWT_PUBLIC_KEY as undefined or null from ConfigService, despite the key being present in .env file

1.3 WHEN the corrupted jwt.strategy.ts file is compiled THEN TypeScript compilation fails due to garbage characters and malformed syntax scattered throughout the file

1.4 WHEN JwtModule.registerAsync receives JWT keys from environment THEN the public and private keys remain in base64-encoded format instead of being decoded to PEM-formatted strings

1.5 WHEN ConfigModule is initialized in app.module.ts THEN it uses relative .env path which may fail to locate the environment file during different working directory contexts

### Expected Behavior (Correct)

The system should exhibit the following correct behaviors:

2.1 WHEN the NestJS backend starts initialization THEN the server successfully initializes the JwtStrategy and begins listening on port 3001 without throwing errors

2.2 WHEN JwtStrategy constructor executes during app initialization THEN it receives a properly decoded base64-to-PEM public key from ConfigService and completes construction without errors

2.3 WHEN jwt.strategy.ts file is processed THEN it compiles successfully with clean, valid TypeScript syntax and no corrupted characters

2.4 WHEN JwtModule.registerAsync receives JWT keys from environment THEN the public and private keys are decoded from base64 to PEM format before being passed to the strategy configuration

2.5 WHEN ConfigModule is initialized in app.module.ts THEN it uses absolute path resolution for the .env file to ensure it can be located regardless of working directory context

### Unchanged Behavior (Regression Prevention)

The following existing behaviors must be preserved and not break during the fix:

3.1 WHEN a valid JWT token is presented in the Authorization header THEN the system SHALL CONTINUE TO validate the token signature using RS256 algorithm with the public key

3.2 WHEN an invalid or expired JWT token is presented THEN the system SHALL CONTINUE TO reject the request with an UnauthorizedException

3.3 WHEN a user successfully authenticates via the login endpoint THEN the system SHALL CONTINUE TO generate access and refresh tokens using RS256 algorithm with the private key

3.4 WHEN the backend runs in production mode (NODE_ENV=production) THEN the system SHALL CONTINUE TO load environment variables from .env correctly

3.5 WHEN the backend runs in development mode (NODE_ENV=development) THEN the system SHALL CONTINUE TO accept requests from the frontend at http://localhost:5173 as configured by FRONTEND_URL

## Bug Condition Specification

**Bug Condition Function - Identifies inputs that trigger the bug:**

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AppInitializationContext
  OUTPUT: boolean
  
  // Returns true when the app initialization is attempted
  RETURN X.phase = "startup" AND X.jwtStrategyInitialization = true AND (
    X.jwt_public_key_decoded = false OR 
    X.jwt.strategy.ts_corrupted = true OR 
    X.configModule.env_path_unresolved = true
  )
END FUNCTION
```

**Property Specification - Fix Checking:**

```pascal
// Property: Fix Checking - Successful JWT Strategy Initialization
FOR ALL X WHERE isBugCondition(X) DO
  result ← InitializeApp(X)
  ASSERT result.status = "success" AND 
          result.port = 3001 AND 
          result.jwtStrategy.initialized = true AND
          result.jwtStrategy.publicKey != null AND
          result.jwtStrategy.algorithm = "RS256"
END FOR
```

**Preservation Goal - Ensure non-buggy inputs unchanged:**

```pascal
// Property: Preservation Checking - Existing Token Validation Behavior
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT ValidateToken(X) = ValidateTokenOriginal(X)
END FOR
```

This ensures that after the fix, all token validation, token generation, and authentication flows continue to work identically to the original implementation.
