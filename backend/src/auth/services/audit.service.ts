import { Injectable, Logger } from '@nestjs/common';

interface AuditLogEntry {
  eventType: string;
  userId?: string;
  email?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /**
   * Log an authentication event
   * @param eventType Type of event ('user_registered', 'login_success', 'login_failed', 'token_refreshed', 'logout_success')
   * @param details Additional details about the event
   */
  async logEvent(eventType: string, details: Record<string, any> = {}): Promise<void> {
    const timestamp = new Date().toISOString();

    const logEntry: AuditLogEntry = {
      eventType,
      userId: details.userId,
      email: details.email,
      details,
      timestamp: new Date(),
    };

    // Never log passwords or sensitive data
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.passwordHash;
    delete safeDetails.token;
    delete safeDetails.refreshToken;

    // Log at appropriate level based on event type
    if (eventType.includes('success')) {
      this.logger.log(
        `[${eventType}] User: ${details.userId || 'unknown'} | Email: ${details.email || 'unknown'} | ${timestamp}`,
        safeDetails,
      );
    } else if (eventType.includes('failed')) {
      this.logger.warn(
        `[${eventType}] Email: ${details.email || 'unknown'} | Reason: ${details.reason || 'unknown'} | ${timestamp}`,
        safeDetails,
      );
    } else {
      this.logger.debug(
        `[${eventType}] User: ${details.userId || 'unknown'} | ${timestamp}`,
        safeDetails,
      );
    }
  }

  /**
   * Retrieve audit log entries (stubbed for now)
   * @param filters Optional filters for audit log query
   * @returns Array of audit log entries
   */
  async getAuditLog(filters?: any): Promise<AuditLogEntry[]> {
    // This would query a database or log file in production
    // For now, returning empty array as logs are written to console/file
    return [];
  }
}
