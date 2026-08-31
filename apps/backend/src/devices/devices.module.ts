import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { DevicesController } from './devices.controller';
import { ZoneDevicesController } from './zone-devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [MonitoringModule],
  controllers: [ZoneDevicesController, DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
