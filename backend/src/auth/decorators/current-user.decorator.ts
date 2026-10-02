import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../strategies/jwt.strategy';

/**
 * Decorator to extract current user from JWT payload
 * Usage: @CurrentUser() user: TokenPayload
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
