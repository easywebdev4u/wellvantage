import { resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { ClientsModule } from './clients/clients.module';
import { AvailabilityModule } from './availability/availability.module';
import { SessionsModule } from './sessions/sessions.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '..', '.env'),
        resolve(__dirname, '..', '..', '.env'),
      ],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 30),
          },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    WorkoutsModule,
    ClientsModule,
    AvailabilityModule,
    SessionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
