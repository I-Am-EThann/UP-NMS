import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { InfluxModule } from '../influx/influx.module';
import { MinioModule } from '../minio/minio.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, InfluxModule, MinioModule],
  controllers: [HealthController],
})
export class HealthModule {}
