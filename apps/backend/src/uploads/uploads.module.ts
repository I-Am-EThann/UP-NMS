import { Module } from '@nestjs/common';
import { MinioModule } from '../minio/minio.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [MinioModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
