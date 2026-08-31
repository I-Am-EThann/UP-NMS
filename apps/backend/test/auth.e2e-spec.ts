import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const findUnique = jest.fn();

  const mockUser = {
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
        user: { findUnique },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('GET /api/health reports the (mocked) database as up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /api/auth/me without a token is rejected', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login rejects a missing password (DTO validation)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login rejects wrong credentials', async () => {
    findUnique.mockResolvedValue(mockUser);
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login sets an httpOnly cookie and returns the user on success, then /api/auth/me works with that cookie', async () => {
    findUnique.mockResolvedValue(mockUser);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'phayao2569' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toEqual({
      id: 'u1',
      username: 'admin',
      displayName: 'admin',
      role: 'ADMINISTRATOR',
    });

    const setCookie = loginRes.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain('up_nms_token=');
    expect(cookieStr.toLowerCase()).toContain('httponly');

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieStr);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({
      id: 'u1',
      username: 'admin',
      displayName: 'admin',
      role: 'ADMINISTRATOR',
    });
  });

  it('POST /api/auth/logout clears the cookie', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/logout');
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain('up_nms_token=;');
  });
});
