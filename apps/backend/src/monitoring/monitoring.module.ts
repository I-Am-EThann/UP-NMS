import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InfluxModule } from '../influx/influx.module';
import { SnmpModule } from '../snmp/snmp.module';
import { MonitoringScheduler } from './monitoring.scheduler';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [ScheduleModule.forRoot(), SnmpModule, InfluxModule],
  providers: [MonitoringService, MonitoringScheduler],
  exports: [MonitoringService],
})
export class MonitoringModule {}
