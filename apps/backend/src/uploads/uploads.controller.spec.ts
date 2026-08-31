import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MinioService } from '../minio/minio.service';
import { UploadsController } from './uploads.controller';

describe('UploadsController', () => {
  let controller: UploadsController;
  const uploadDeviceImage = jest.fn();

  function file(
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: 'photo.png',
      mimetype: 'image/png',
      buffer: Buffer.from('fake'),
      size: 4,
      ...overrides,
    } as Express.Multer.File;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [{ provide: MinioService, useValue: { uploadDeviceImage } }],
    }).compile();

    controller = moduleRef.get(UploadsController);
  });

  it('rejects when no file is provided', async () => {
    await expect(
      controller.uploadDeviceImage(undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported mime types', async () => {
    await expect(
      controller.uploadDeviceImage(file({ mimetype: 'application/pdf' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadDeviceImage).not.toHaveBeenCalled();
  });

  it('uploads a valid image and returns its URL', async () => {
    uploadDeviceImage.mockResolvedValue({
      url: 'http://localhost:9000/device-images/devices/abc.png',
      objectKey: 'devices/abc.png',
    });

    const result = await controller.uploadDeviceImage(file());

    expect(uploadDeviceImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'photo.png',
      'image/png',
    );
    expect(result).toEqual({
      url: 'http://localhost:9000/device-images/devices/abc.png',
    });
  });
});
