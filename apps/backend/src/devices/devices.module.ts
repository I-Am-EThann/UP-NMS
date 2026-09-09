import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { InfluxModule } from '../influx/influx.module';
import { MinioModule } from '../minio/minio.module';
import { DevicesController } from './devices.controller';
import { ZoneDevicesController } from './zone-devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [MonitoringModule, InfluxModule, MinioModule],
  controllers: [ZoneDevicesController, DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
