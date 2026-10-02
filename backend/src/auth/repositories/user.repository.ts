import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
  ) {}

  /**
   * Find user by email using parameterized query for SQL injection prevention
   * @param email User email address
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  /**
   * Find user by userId using parameterized query
   * @param userId User UUID
   * @returns User entity or null if not found
   */
  async findById(userId: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { userId },
    });
  }

  /**
   * Create new user with email and password hash
   * @param email User email address
   * @param passwordHash Bcrypt password hash
   * @param userId User UUID
   * @returns Created user entity
   */
  async create(
    userId: string,
    email: string,
    passwordHash: string,
  ): Promise<UserEntity> {
    const user = this.repository.create({
      userId,
      email,
      passwordHash,
    });
    return this.repository.save(user);
  }

  /**
   * Check if email exists in database using parameterized query
   * @param email Email address to check
   * @returns true if email exists, false otherwise
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { email },
    });
    return count > 0;
  }
}
