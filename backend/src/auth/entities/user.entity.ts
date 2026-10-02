import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RefreshTokenEntity } from './refresh-token.entity';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
export class UserEntity {
  @PrimaryColumn('text')
  userId!: string; // UUID

  @Column('text', { unique: true })
  email!: string;

  @Column('varchar', { length: 60 })
  passwordHash!: string; // bcrypt hash

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => RefreshTokenEntity, (token) => token.user, {
    cascade: ['remove'],
  })
  refreshTokens!: RefreshTokenEntity[];
}
