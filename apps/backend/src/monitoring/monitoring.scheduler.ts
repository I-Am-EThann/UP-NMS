import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppConfig } from '../config/configuration';
import { MonitoringService } from './monitoring.service';

const INTERVAL_NAME = 'device-polling';

@Injectable()
export class MonitoringScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringScheduler.name);

  constructor(
    private readonly monitoring: MonitoringService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const intervalMs = this.config.get('snmp', { infer: true }).pollIntervalMs;

    const interval = setInterval(() => {
      this.monitoring.pollAllDevices().catch((error: unknown) => {
        this.logger.error(
          `Polling cycle failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, intervalMs);

    this.scheduler.addInterval(INTERVAL_NAME, interval);
    this.logger.log(`Device polling scheduled every ${intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.scheduler.doesExist('interval', INTERVAL_NAME)) {
      this.scheduler.deleteInterval(INTERVAL_NAME);
    }
  }
}
