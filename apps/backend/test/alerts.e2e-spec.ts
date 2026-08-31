import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/minio/minio.service';

describe('Alerts (e2e)', () => {
  let app: INestApplication;
  let authCookie: string;

  const alertFindMany = jest.fn();
  const user = { findUnique: jest.fn() };

  const mockAdmin = {
    id: 'u1',
    username: 'admin',
    displayName: 'admin',
    passwordHash: bcrypt.hashSync('phayao2569', 10),
    role: 'ADMINISTRATOR',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user,
        alert: { findMany: alertFindMany },
        device: { findMany: jest.fn().mockResolvedValue([]) },
        zone: {},
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .overrideProvider(MinioService)
      .useValue({
        onModuleInit: jest.fn(),
        uploadDeviceImage: jest.fn(),
        deleteByUrl: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    user.findUnique.mockResolvedValue(mockAdmin);
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'phayao2569' });
    const setCookie = loginRes.headers['set-cookie'];
    authCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    alertFindMany.mockReset();
  });

  it('requires auth', async () => {
    const res = await request(app.getHttpServer()).get('/api/alerts');
    expect(res.status).toBe(401);
  });

  it('returns alerts sorted Critical-first, joined with zone/device names', async () => {
    alertFindMany.mockResolvedValue([
      {
        id: 'a1',
        zoneId: 'z1',
        deviceId: 'd1',
        severity: 'NORMAL',
        messageKey: 'HIGH_MEMORY',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        zone: { name: 'Zone One' },
        device: { name: 'SW-1', kind: 'SWITCH' },
      },
      {
        id: 'a2',
        zoneId: 'z1',
        deviceId: 'd2',
        severity: 'CRITICAL',
        messageKey: 'DEVICE_OFFLINE',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        zone: { name: 'Zone One' },
        device: { name: 'AP-1', kind: 'ACCESS_POINT' },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/alerts')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: 'a2',
      severity: 'CRITICAL',
      zoneName: 'Zone One',
    });
    expect(res.body[1]).toMatchObject({ id: 'a1', severity: 'NORMAL' });
  });

  it('validates the severity query param', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/alerts?severity=NOT_A_SEVERITY')
      .set('Cookie', authCookie);
    expect(res.status).toBe(400);
  });

  it('passes zoneId filter through as a query param', async () => {
    alertFindMany.mockResolvedValue([]);
    const res = await request(app.getHttpServer())
      .get('/api/alerts?zoneId=zone-eng')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(alertFindMany.mock.calls[0][0].where).toEqual({
      zoneId: 'zone-eng',
    });
  });
});
