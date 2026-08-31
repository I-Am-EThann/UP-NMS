import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<AppConfig, true>,
      ): JwtModuleOptions => ({
        secret: config.get('jwt', { infer: true }).secret,
      }),
    }),
  ],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
