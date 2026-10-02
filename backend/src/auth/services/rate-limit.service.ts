import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';

@Injectable()
export class RateLimitService {
  private readonly maxFailedAttempts = 5;
  private readonly lockoutWindow = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly cleanupThreshold = 30 * 60 * 1000; // 30 minutes for cleanup

  constructor(private loginAttemptRepository: LoginAttemptRepository) {}

  /**
   * Record a failed login attempt and cleanup old attempts
   * @param email Email address (will be normalized to lowercase)
   */
  async recordFailedAttempt(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const windowStart = new Date(Date.now() - this.lockoutWindow);

    // Create new failed attempt record
    await this.loginAttemptRepository.create({
      attemptId: uuidv4(),
      email: normalizedEmail,
      success: false,
      timestamp: new Date(),
    });

    // Cleanup old attempts outside the lockout window
    const cleanupThresholdDate = new Date(Date.now() - this.cleanupThreshold);
    await this.loginAttemptRepository.deleteOlderThan(cleanupThresholdDate);
  }

  /**
   * Check if an account is locked due to too many failed attempts
   * @param email Email address (will be normalized to lowercase)
   * @returns true if account is locked, false otherwise
   */
  async isAccountLocked(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const windowStart = new Date(Date.now() - this.lockoutWindow);

    const failedAttempts = await this.loginAttemptRepository.countFailedAttempts(
      normalizedEmail,
      windowStart,
    );

    return failedAttempts >= this.maxFailedAttempts;
  }

  /**
   * Clear all failed login attempts for an email (called on successful login)
   * @param email Email address (will be normalized to lowercase)
   */
  async clearFailedAttempts(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.loginAttemptRepository.deleteByEmail(normalizedEmail);
  }

  /**
   * Record a successful login attempt for audit purposes
   * @param email Email address (will be normalized to lowercase)
   */
  async recordSuccessfulAttempt(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.loginAttemptRepository.create({
      attemptId: uuidv4(),
      email: normalizedEmail,
      success: true,
      timestamp: new Date(),
    });
  }
}
