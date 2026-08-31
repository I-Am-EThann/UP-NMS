import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  const verifyAsync = jest.fn();

  function makeSocket(cookieHeader?: string) {
    return {
      id: 'socket-1',
      handshake: { headers: { cookie: cookieHeader } },
      data: {} as Record<string, unknown>,
      disconnect: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    } as unknown as import('socket.io').Socket;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: { verifyAsync } },
        {
          provide: ConfigService,
          useValue: { get: () => ({ secret: 'test-secret' }) },
        },
      ],
    }).compile();

    gateway = moduleRef.get(RealtimeGateway);
  });

  describe('handleConnection', () => {
    it('disconnects a socket with no auth cookie', async () => {
      const socket = makeSocket(undefined);
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(verifyAsync).not.toHaveBeenCalled();
    });

    it('disconnects a socket with an invalid/expired token', async () => {
      verifyAsync.mockRejectedValue(new Error('jwt expired'));
      const socket = makeSocket('up_nms_token=bad-token');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('accepts a socket with a valid token and stores the user id', async () => {
      verifyAsync.mockResolvedValue({ sub: 'u1', username: 'admin' });
      const socket = makeSocket('up_nms_token=good-token');

      await gateway.handleConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.data.userId).toBe('u1');
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('joins the per-device room on subscribe', () => {
      const socket = makeSocket();
      gateway.handleSubscribe(socket, { deviceId: 'd1' });
      expect(socket.join).toHaveBeenCalledWith('device:d1');
    });

    it('ignores subscribe with no deviceId', () => {
      const socket = makeSocket();
      gateway.handleSubscribe(socket, {} as { deviceId: string });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('leaves the per-device room on unsubscribe', () => {
      const socket = makeSocket();
      gateway.handleUnsubscribe(socket, { deviceId: 'd1' });
      expect(socket.leave).toHaveBeenCalledWith('device:d1');
    });
  });

  describe('handleDeviceMetricsUpdated', () => {
    it('broadcasts to the device room only', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as unknown as import('socket.io').Server;

      gateway.handleDeviceMetricsUpdated({
        deviceId: 'd1',
        zoneId: 'z1',
        status: 'ONLINE',
        severity: 'NORMAL',
        cpuUsagePercent: 20,
        memoryUsagePercent: 30,
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      expect(to).toHaveBeenCalledWith('device:d1');
      expect(emit).toHaveBeenCalledWith(
        'device:metrics',
        expect.objectContaining({ deviceId: 'd1' }),
      );
    });
  });
});
