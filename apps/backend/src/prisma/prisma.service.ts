import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // NOTE: $connect/$disconnect are typed `any` until `npx prisma generate`
  // has run (it needs network access to binaries.prisma.sh) — the calls
  // below are standard Prisma lifecycle usage and will be fully typed once
  // generation succeeds on a machine with normal internet access.

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
