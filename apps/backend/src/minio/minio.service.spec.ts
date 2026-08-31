import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

const bucketExists = jest.fn();
const makeBucket = jest.fn();
const setBucketPolicy = jest.fn();
const putObject = jest.fn();
const removeObject = jest.fn();

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists,
    makeBucket,
    setBucketPolicy,
    putObject,
    removeObject,
  })),
}));

function makeConfig() {
  return {
    get: () => ({
      endpoint: 'localhost',
      publicEndpoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'upnms',
      secretKey: 'upnms-secret',
      bucket: 'device-images',
    }),
  } as unknown as ConfigService<
    import('../config/configuration').AppConfig,
    true
  >;
}

describe('MinioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('creates the bucket and sets a public-read policy when it does not exist yet', async () => {
      bucketExists.mockResolvedValue(false);
      const service = new MinioService(makeConfig());

      await service.onModuleInit();

      expect(makeBucket).toHaveBeenCalledWith('device-images');
      expect(setBucketPolicy).toHaveBeenCalledTimes(1);
      const [bucketArg, policyJson] = setBucketPolicy.mock.calls[0] as [
        string,
        string,
      ];
      expect(bucketArg).toBe('device-images');
      expect(JSON.parse(policyJson)).toMatchObject({
        Statement: [expect.objectContaining({ Effect: 'Allow' })],
      });
    });

    it('does nothing if the bucket already exists', async () => {
      bucketExists.mockResolvedValue(true);
      const service = new MinioService(makeConfig());

      await service.onModuleInit();

      expect(makeBucket).not.toHaveBeenCalled();
      expect(setBucketPolicy).not.toHaveBeenCalled();
    });

    it('does not throw if MinIO is unreachable at boot', async () => {
      bucketExists.mockRejectedValue(new Error('connect ECONNREFUSED'));
      const service = new MinioService(makeConfig());

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('uploadDeviceImage', () => {
    it('uploads the buffer and returns a public URL under devices/', async () => {
      putObject.mockResolvedValue({});
      const service = new MinioService(makeConfig());

      const result = await service.uploadDeviceImage(
        Buffer.from('fake-image-bytes'),
        'switch-photo.png',
        'image/png',
      );

      expect(putObject).toHaveBeenCalledWith(
        'device-images',
        expect.stringMatching(/^devices\/.+\.png$/),
        expect.any(Buffer),
        expect.any(Number),
        { 'Content-Type': 'image/png' },
      );
      expect(result.url).toBe(
        `http://localhost:9000/device-images/${result.objectKey}`,
      );
    });
  });

  describe('deleteByUrl', () => {
    it('removes the object when the URL belongs to our bucket', async () => {
      removeObject.mockResolvedValue({});
      const service = new MinioService(makeConfig());

      await service.deleteByUrl(
        'http://localhost:9000/device-images/devices/abc.png',
      );

      expect(removeObject).toHaveBeenCalledWith(
        'device-images',
        'devices/abc.png',
      );
    });

    it('ignores URLs that are not from our bucket', async () => {
      const service = new MinioService(makeConfig());
      await service.deleteByUrl('https://example.com/some-other-image.png');
      expect(removeObject).not.toHaveBeenCalled();
    });
  });
});
