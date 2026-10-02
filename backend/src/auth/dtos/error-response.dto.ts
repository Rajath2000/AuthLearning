export class ErrorResponseDto {
  status!: number;
  message!: string;
  error!: string;
  timestamp!: string;
  details?: Record<string, any>;
}
