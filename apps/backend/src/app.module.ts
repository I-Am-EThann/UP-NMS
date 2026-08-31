import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ZonesModule } from './zones/zones.module';
import { DevicesModule } from './devices/devices.module';
import { UploadsModule } from './uploads/uploads.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    ZonesModule,
    DevicesModule,
    UploadsModule,
    MonitoringModule,
    RealtimeModule,
    AlertsModule,
    HealthModule,
  ],
})
export class AppModule {}
