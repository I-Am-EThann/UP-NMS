import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinioService } from '../minio/minio.service';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly minio: MinioService) {}

  @Post('device-image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SIZE_BYTES } }),
  )
  async uploadDeviceImage(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded (expected field "file")');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}" — allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const { url } = await this.minio.uploadDeviceImage(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return { url };
  }
}
