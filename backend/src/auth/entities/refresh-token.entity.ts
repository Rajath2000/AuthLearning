import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', ['userId'])
@Index('idx_refresh_tokens_revoked', ['revoked'])
export class RefreshTokenEntity {
  @PrimaryColumn('text')
  tokenId!: string; // UUID

  @Column('text')
  userId!: string; // Foreign key

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column('varchar', { length: 60 })
  tokenHash!: string; // bcrypt hash of token

  @Column('datetime')
  issuedAt!: Date;

  @Column('datetime')
  expiresAt!: Date;

  @Column('boolean', { default: false })
  revoked!: boolean;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
