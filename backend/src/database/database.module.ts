import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('NODE_ENV', 'development');
        return {
          type: 'better-sqlite3' as const,
          database: configService.get<string>('DATABASE_URL', 'auth.db'),
          entities: [__dirname + '/../**/*.entity.ts'],
          synchronize: env === 'development',
          logging: env === 'development',
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
