import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface AuthResponse {
  status: number;
  message: string;
  data: any;
  timestamp: string;
}

/**
 * Interceptor to wrap all auth responses in a consistent format
 * Ensures all responses follow: {status, message, data, timestamp}
 */
@Injectable()
export class AuthResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;
        const message =
          this.getDefaultMessage(statusCode, request.method) || 'Success';

        const wrappedResponse: AuthResponse = {
          status: statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
        };

        return wrappedResponse;
      }),
    );
  }

  /**
   * Get default message based on HTTP status and method
   */
  private getDefaultMessage(status: number, method: string): string {
    switch (status) {
      case 201:
        return 'Resource created successfully';
      case 200:
        return 'Success';
      case 204:
        return 'No content';
      default:
        return 'Success';
    }
  }
}
