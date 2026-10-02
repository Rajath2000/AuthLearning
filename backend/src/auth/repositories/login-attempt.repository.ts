import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { LoginAttemptEntity } from '../entities/login-attempt.entity';

@Injectable()
export class LoginAttemptRepository {
  constructor(
    @InjectRepository(LoginAttemptEntity)
    private repository: Repository<LoginAttemptEntity>,
  ) {}

  /**
   * Create a new login attempt record
   * @param attempt Login attempt entity
   * @returns Created attempt entity
   */
  async create(attempt: Partial<LoginAttemptEntity>): Promise<LoginAttemptEntity> {
    const entity = this.repository.create(attempt);
    return this.repository.save(entity);
  }

  /**
   * Count failed login attempts for an email since a specific timestamp
   * @param email Email address (normalized to lowercase)
   * @param since Date from which to count attempts
   * @returns Number of failed attempts
   */
  async countFailedAttempts(email: string, since: Date): Promise<number> {
    return this.repository.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        timestamp: MoreThan(since),
      },
    });
  }

  /**
   * Delete all login attempts older than a specific date
   * @param date Cutoff date for deletion
   */
  async deleteOlderThan(date: Date): Promise<void> {
    await this.repository.delete({
      timestamp: LessThan(date),
    });
  }

  /**
   * Delete all login attempts for a specific email
   * @param email Email address (normalized to lowercase)
   */
  async deleteByEmail(email: string): Promise<void> {
    await this.repository.delete({
      email: email.toLowerCase(),
    });
  }
}
