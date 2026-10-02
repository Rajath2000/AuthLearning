import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Create a new user with email and password hash
   * @param email User email address (will be normalized to lowercase)
   * @param passwordHash Bcrypt password hash
   * @returns Created user entity
   */
  async create(email: string, passwordHash: string): Promise<UserEntity> {
    const userId = uuidv4();
    const normalizedEmail = email.toLowerCase();

    return this.userRepository.create(userId, normalizedEmail, passwordHash);
  }

  /**
   * Find user by email address
   * @param email Email address to search for (will be normalized to lowercase)
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalizedEmail = email.toLowerCase();
    return this.userRepository.findByEmail(normalizedEmail);
  }

  /**
   * Find user by user ID
   * @param userId User UUID
   * @returns User entity or null if not found
   */
  async findById(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findById(userId);
  }

  /**
   * Check if an email address already exists
   * @param email Email address to check (will be normalized to lowercase)
   * @returns true if email exists, false otherwise
   */
  async exists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    return this.userRepository.checkEmailExists(normalizedEmail);
  }
}
