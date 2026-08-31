import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/minio/minio.service';

describe('Zones + Devices (e2e)', () => {
  let app: INestApplication;
  let authCookie: string;

  const zone = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const device = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
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
        zone,
        device,
        user,
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
    zone.findMany.mockReset();
    zone.findUnique.mockReset();
    zone.create.mockReset();
    zone.update.mockReset();
    zone.delete.mockReset();
    device.findMany.mockReset();
    device.findUnique.mockReset();
    device.create.mockReset();
    device.update.mockReset();
    device.delete.mockReset();
  });

  it('all zone/device routes require auth', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get('/api/zones')).status).toBe(401);
    expect(
      (await request(server).post('/api/zones').send({ name: 'X' })).status,
    ).toBe(401);
    expect((await request(server).get('/api/devices/d1')).status).toBe(401);
  });

  it('GET /api/zones returns zones with computed summaries', async () => {
    zone.findMany.mockResolvedValue([{ id: 'z1', name: 'Zone One' }]);
    device.findMany.mockResolvedValue([
      { zoneId: 'z1', kind: 'SWITCH', status: 'ONLINE', severity: 'NORMAL' },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/zones')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'z1',
        name: 'Zone One',
        switchCount: 1,
        accessPointCount: 0,
        onlineCount: 1,
        offlineCount: 0,
        alertCounts: { critical: 0, major: 0, warning: 0, normal: 1 },
      },
    ]);
  });

  it('POST /api/zones rejects an empty name (DTO validation)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/zones')
      .set('Cookie', authCookie)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('POST /api/zones returns 409 on duplicate name', async () => {
    zone.create.mockRejectedValue({ code: 'P2002' });
    const res = await request(app.getHttpServer())
      .post('/api/zones')
      .set('Cookie', authCookie)
      .send({ name: 'Existing Zone' });
    expect(res.status).toBe(409);
  });

  it('POST /api/zones/:zoneId/devices creates a device with server-side defaults', async () => {
    zone.findUnique.mockResolvedValue({ id: 'z1', name: 'Zone One' });
    device.create.mockResolvedValue({
      id: 'd1',
      zoneId: 'z1',
      kind: 'SWITCH',
      status: 'ONLINE',
      severity: 'NORMAL',
      ports: [],
    });

    const res = await request(app.getHttpServer())
      .post('/api/zones/z1/devices')
      .set('Cookie', authCookie)
      .send({
        kind: 'SWITCH',
        name: 'SW-1',
        ipAddress: '10.0.0.5',
        brand: 'Cisco',
        model: 'X',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ONLINE');
    expect(res.body.severity).toBe('NORMAL');
  });

  it('POST /api/zones/:zoneId/devices rejects an invalid IP address', async () => {
    zone.findUnique.mockResolvedValue({ id: 'z1', name: 'Zone One' });
    const res = await request(app.getHttpServer())
      .post('/api/zones/z1/devices')
      .set('Cookie', authCookie)
      .send({
        kind: 'SWITCH',
        name: 'SW-1',
        ipAddress: 'not-an-ip',
        brand: 'Cisco',
        model: 'X',
      });
    expect(res.status).toBe(400);
    expect(device.create).not.toHaveBeenCalled();
  });

  it('GET /api/devices/:id returns 404 for a missing device', async () => {
    device.findUnique.mockResolvedValue(null);
    const res = await request(app.getHttpServer())
      .get('/api/devices/missing')
      .set('Cookie', authCookie);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/zones/:id returns 204 on success', async () => {
    zone.delete.mockResolvedValue({ id: 'z1' });
    const res = await request(app.getHttpServer())
      .delete('/api/zones/z1')
      .set('Cookie', authCookie);
    expect(res.status).toBe(204);
  });
});
