import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/minio/minio.service';
import { DEVICE_METRICS_UPDATED_EVENT } from '../src/realtime/realtime.events';

describe('Realtime WebSocket (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let authCookie: string;

  const user = { findUnique: jest.fn() };
  const device = { findMany: jest.fn().mockResolvedValue([]) };

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
        device,
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
    await app.listen(0); // random free port — sockets need a real listener

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

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

  function connect(cookie?: string): ClientSocket {
    return io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: cookie ? { Cookie: cookie } : undefined,
      reconnection: false,
      forceNew: true,
    });
  }

  it('rejects a connection with no auth cookie', (done) => {
    const client = connect(undefined);
    client.on('disconnect', () => {
      client.close();
      done();
    });
    client.on('connect_error', () => {
      client.close();
      done();
    });
  });

  it('accepts a connection with a valid auth cookie', (done) => {
    const client = connect(authCookie);
    client.on('connect', () => {
      client.close();
      done();
    });
    client.on('connect_error', (err) => done(err));
  });

  it('broadcasts device:metrics only to clients subscribed to that device room', (done) => {
    const subscribed = connect(authCookie);
    const notSubscribed = connect(authCookie);
    let subscribedGotIt = false;

    const finish = () => {
      subscribed.close();
      notSubscribed.close();
      done();
    };

    subscribed.on('connect', () => {
      subscribed.emit('device:subscribe', { deviceId: 'd1' });

      setTimeout(() => {
        const emitter = app.get(EventEmitter2);
        emitter.emit(DEVICE_METRICS_UPDATED_EVENT, {
          deviceId: 'd1',
          zoneId: 'z1',
          status: 'ONLINE',
          severity: 'NORMAL',
          cpuUsagePercent: 42,
          memoryUsagePercent: 55,
          timestamp: new Date().toISOString(),
        });
      }, 50);
    });

    subscribed.on(
      'device:metrics',
      (payload: { deviceId: string; cpuUsagePercent: number }) => {
        subscribedGotIt = true;
        expect(payload.deviceId).toBe('d1');
        expect(payload.cpuUsagePercent).toBe(42);
      },
    );

    notSubscribed.on('device:metrics', () => {
      fail('unsubscribed client received a device:metrics broadcast');
    });

    setTimeout(() => {
      expect(subscribedGotIt).toBe(true);
      finish();
    }, 300);
  });
});
