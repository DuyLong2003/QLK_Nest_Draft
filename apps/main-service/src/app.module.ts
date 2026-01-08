import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './auth/auth.module';
import { PolicyAdminModule } from './policy-admin/policy-admin.module';
import { UsersModule } from './users/users.module';
import { FncRoleModule } from './fnc-roles/fnc-roles.module';
import { TokenModule } from './tokens/tokens.module';
import { HealthController } from './health/health.controller';
import { FileModule } from './file/file.module';
import { SERVICES, KAFKA_CLIENT_CONFIG } from '@app/shared';
import { OpaAuthorizationGuard } from './common/guards/opa.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL') || 
             configService.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService],
    }),
    // JWT Module for token verification
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL') || 60000,
          limit: configService.get<number>('RATE_LIMIT_LIMIT') || 10,
        },
      ],
      inject: [ConfigService],
    }),
    // Cấu hình Kafka client để giao tiếp với Upload Service
    // ClientsModule.register([
    //   {
    //     name: SERVICES.UPLOAD_SERVICE,
    //     transport: Transport.KAFKA,
    //     options: {
    //       client: {
    //         ...KAFKA_CLIENT_CONFIG,
    //         clientId: 'main-service',
    //       },
    //       consumer: {
    //         groupId: 'main-service-consumer',
    //       },
    //     },
    //   },
    // ]),
    // AuthModule,
    UsersModule,
    FncRoleModule,
    TokenModule,
    PolicyAdminModule,
    // FileModule, // Module mới để xử lý file upload qua Kafka
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OpaAuthorizationGuard,
    },
  ],
})

export class AppModule {}