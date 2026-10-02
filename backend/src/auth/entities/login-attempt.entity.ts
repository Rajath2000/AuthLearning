import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('login_attempts')
@Index('idx_login_attempts_email', ['email'])
@Index('idx_login_attempts_timestamp', ['timestamp'])
export class LoginAttemptEntity {
  @PrimaryColumn('text')
  attemptId!: string; // UUID

  @Column('text')
  email!: string;

  @Column('boolean')
  success!: boolean;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;
}
