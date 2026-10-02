import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
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
