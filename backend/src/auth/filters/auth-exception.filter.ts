import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dtos/error-response.dto';

/**
 * Global exception filter for authentication endpoints
 * Converts all exceptions to consistent error response format
 */
@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract error details
    let message = 'An unexpected error occurred';
    let errorCode = 'INTERNAL_ERROR';
    let details: Record<string, any> | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const errorObj = exceptionResponse as Record<string, any>;
      message = errorObj.message || message;
      errorCode = errorObj.error || errorCode;
      details = errorObj.details;

      // Handle validation errors
      if (status === HttpStatus.BAD_REQUEST && Array.isArray(errorObj.message)) {
        message = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
        details = {
          validationErrors: errorObj.message,
        };
      }
    }

    // Create consistent error response
    const errorResponse: ErrorResponseDto = {
      status,
      message,
      error: errorCode,
      timestamp: new Date().toISOString(),
      details,
    };

    // Log the error
    if (status >= 500) {
      this.logger.error(
        `Exception caught: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status}: ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
