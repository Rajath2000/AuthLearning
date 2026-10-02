export class AuthResponseDto {
  userId?: string;
  email?: string;
  createdAt?: Date;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}
