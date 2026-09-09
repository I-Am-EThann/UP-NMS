import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';
import { AppConfig } from '../config/configuration';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const minio = config.get('minio', { infer: true });
    this.bucket = minio.bucket;
    this.client = new Minio.Client({
      endPoint: minio.endpoint,
      port: minio.port,
      useSSL: minio.useSSL,
      accessKey: minio.accessKey,
      secretKey: minio.secretKey,
    });
    const scheme = minio.useSSL ? 'https' : 'http';
    this.publicBaseUrl = `${scheme}://${minio.publicEndpoint}:${minio.port}/${minio.bucket}`;
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        // Device images are shown directly as <img src> in the dashboard,
        // so the bucket (not individual objects) is world-readable.
        await this.client.setBucketPolicy(
          this.bucket,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        );
      }
      this.logger.log(`MinIO bucket "${this.bucket}" ready`);
    } catch (error) {
      // Don't crash the whole app if MinIO isn't reachable yet at boot —
      // uploads will just fail until it is, same spirit as the Prisma
      // connection not being a hard startup requirement for unrelated routes.
      this.logger.error(
        `Could not initialize MinIO bucket "${this.bucket}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async uploadDeviceImage(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<{ url: string; objectKey: string }> {
    const ext = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.'))
      : '';
    const objectKey = `devices/${randomUUID()}${ext}`;

    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': mimetype,
    });

    return { url: `${this.publicBaseUrl}/${objectKey}`, objectKey };
  }

  async deleteByUrl(url: string): Promise<void> {
    if (!url.startsWith(this.publicBaseUrl)) return; // not one of ours
    const objectKey = url.slice(this.publicBaseUrl.length + 1);
    await this.client.removeObject(this.bucket, objectKey).catch((error) => {
      this.logger.warn(`Failed to delete "${objectKey}": ${String(error)}`);
    });
  }

  /** Cheap reachability check for the health endpoint. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucket);
      return true;
    } catch {
      return false;
    }
  }
}
