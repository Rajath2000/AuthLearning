import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  /**
   * Hash a plaintext password using bcrypt with salt round 10
   * @param password Plaintext password to hash
   * @returns Bcrypt hash string
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      throw new InternalServerErrorException('Password hashing failed');
    }
  }

  /**
   * Verify a plaintext password against a bcrypt hash using constant-time comparison
   * @param password Plaintext password to verify
   * @param hash Bcrypt hash to compare against
   * @returns true if password matches hash, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // bcrypt.compare uses constant-time comparison internally
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Return false on any error (e.g., invalid hash format)
      return false;
    }
  }

  /**
   * Validate that a hash is a valid bcrypt hash
   * @param hash Hash string to validate
   * @returns true if hash is valid bcrypt format ($2a$, $2b$, or $2y$), false otherwise
   */
  isValidPasswordHash(hash: string): boolean {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost and salt
    return /^\$2[aby]\$\d{2}\$/.test(hash);
  }
}
