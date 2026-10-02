import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private repository: Repository<RefreshTokenEntity>,
  ) {}

  /**
   * Create a new refresh token record
   * @param token Refresh token record with all fields
   * @returns Created token entity
   */
  async create(token: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const entity = this.repository.create(token);
    return this.repository.save(entity);
  }

  /**
   * Find refresh token by user ID and token hash
   * @param userId User UUID
   * @param tokenHash Bcrypt hash of the token
   * @returns Token entity or null if not found
   */
  async findByUserIdAndHash(
    userId: string,
    tokenHash: string,
  ): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { userId, tokenHash },
    });
  }

  /**
   * Find all active (non-revoked) refresh tokens for a user
   * @param userId User UUID
   * @returns Array of active token entities
   */
  async findActiveByUserId(userId: string): Promise<RefreshTokenEntity[]> {
    return this.repository.find({
      where: { userId, revoked: false },
    });
  }

  /**
   * Update a refresh token record (e.g., revoke)
   * @param tokenId Token ID
   * @param updates Partial updates to apply
   */
  async update(tokenId: string, updates: Partial<RefreshTokenEntity>): Promise<void> {
    await this.repository.update({ tokenId }, updates);
  }

  /**
   * Revoke all active refresh tokens for a user in a single transaction
   * @param userId User UUID
   */
  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repository.update(
      { userId, revoked: false },
      { revoked: true, updatedAt: new Date() },
    );
  }
}
