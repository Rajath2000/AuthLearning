import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base authentication exception class
 */
export class AuthException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.UNAUTHORIZED,
    errorCode: string = 'AUTH_ERROR',
    details?: Record<string, any>,
  ) {
    super(
      {
        message,
        error: errorCode,
        details,
      },
      statusCode,
    );
  }
}

/**
 * Exception thrown when credentials are invalid
 */
export class InvalidCredentialsException extends AuthException {
  constructor() {
    super(
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
    );
  }
}

/**
 * Exception thrown when account is locked due to failed attempts
 */
export class AccountLockedException extends AuthException {
  constructor() {
    super(
      'Account locked due to multiple failed attempts',
      HttpStatus.TOO_MANY_REQUESTS,
      'ACCOUNT_LOCKED',
    );
  }
}

/**
 * Exception thrown when email is already registered
 */
export class EmailAlreadyExistsException extends AuthException {
  constructor() {
    super(
      'Email already registered',
      HttpStatus.CONFLICT,
      'EMAIL_EXISTS',
    );
  }
}

/**
 * Exception thrown when token is expired
 */
export class TokenExpiredException extends AuthException {
  constructor(tokenType: 'access' | 'refresh' = 'access') {
    super(
      `${tokenType === 'access' ? 'Access' : 'Refresh'} token expired`,
      HttpStatus.UNAUTHORIZED,
      'TOKEN_EXPIRED',
    );
  }
}

/**
 * Exception thrown when token is invalid
 */
export class InvalidTokenException extends AuthException {
  constructor(reason: string = 'Invalid token') {
    super(
      reason,
      HttpStatus.UNAUTHORIZED,
      'INVALID_TOKEN',
    );
  }
}

/**
 * Exception thrown when token has been revoked
 */
export class TokenRevokedException extends AuthException {
  constructor(tokenType: 'access' | 'refresh' = 'refresh') {
    super(
      `${tokenType === 'access' ? 'Access' : 'Refresh'} token has been revoked`,
      HttpStatus.UNAUTHORIZED,
      'TOKEN_REVOKED',
    );
  }
}

/**
 * Exception thrown when authorization header is missing
 */
export class MissingAuthorizationException extends AuthException {
  constructor() {
    super(
      'Authorization header missing',
      HttpStatus.UNAUTHORIZED,
      'MISSING_AUTH_HEADER',
    );
  }
}

/**
 * Exception thrown when token payload is invalid
 */
export class InvalidTokenPayloadException extends AuthException {
  constructor() {
    super(
      'Invalid token payload',
      HttpStatus.BAD_REQUEST,
      'INVALID_TOKEN_PAYLOAD',
    );
  }
}
