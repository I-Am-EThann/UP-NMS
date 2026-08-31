import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { MockSnmpProvider } from './mock-snmp.provider';
import { RealSnmpProvider } from './real-snmp.provider';
import { SNMP_PROVIDER } from './snmp-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    MockSnmpProvider,
    RealSnmpProvider,
    {
      provide: SNMP_PROVIDER,
      inject: [ConfigService, MockSnmpProvider, RealSnmpProvider],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        mock: MockSnmpProvider,
        real: RealSnmpProvider,
      ) => {
        const provider = config.get('snmp', { infer: true }).provider;
        return provider === 'real' ? real : mock;
      },
    },
  ],
  exports: [SNMP_PROVIDER],
})
export class SnmpModule {}
