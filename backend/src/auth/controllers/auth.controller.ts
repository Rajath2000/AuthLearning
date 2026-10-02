import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthExceptionFilter } from '../filters/auth-exception.filter';
import { AuthResponseInterceptor } from '../interceptors/auth-response.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';
import { TokenPayload } from '../strategies/jwt.strategy';

/**
 * Authentication controller handling all auth endpoints
 */
@Controller('api/auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Register a new user with email and password
   * @param registerDto Email and password
   * @returns User data with creation timestamp
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AuthResponseInterceptor)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/auth/login
   * Authenticate user with email and password
   * @param loginDto Email and password
   * @returns Access token, refresh token, and token metadata
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthResponseInterceptor)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/refresh
   * Refresh an expired access token using a refresh token
   * @param refreshTokenDto Refresh token
   * @returns New access token and refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthResponseInterceptor)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * POST /api/auth/logout
   * Logout user by revoking all refresh tokens
   * Requires valid access token in Authorization header
   * @param user Current user from JWT token
   * @returns Logout success message
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuthResponseInterceptor)
  async logout(@CurrentUser() user: TokenPayload): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logout successful' };
  }
}
