import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let findUnique: jest.Mock;

  const validHash = bcrypt.hashSync('phayao2569', 10);
  const mockUser = {
    id: 'u1',
    username: 'admin',
    displayName: 'admin',
    passwordHash: validHash,
    role: 'ADMINISTRATOR' as const,
  };

  beforeEach(async () => {
    findUnique = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique } },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('returns the user when the username and password are correct', async () => {
      findUnique.mockResolvedValue(mockUser);

      const result = await service.validateCredentials('admin', 'phayao2569');

      expect(result).toEqual({
        id: 'u1',
        username: 'admin',
        displayName: 'admin',
        role: 'ADMINISTRATOR',
      });
      expect(findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
    });

    it('throws UnauthorizedException when the username does not exist', async () => {
      findUnique.mockResolvedValue(null);

      await expect(
        service.validateCredentials('nope', 'whatever'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      findUnique.mockResolvedValue(mockUser);

      await expect(
        service.validateCredentials('admin', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('issueToken', () => {
    it('signs a JWT with the expected payload shape', () => {
      const token = service.issueToken({
        id: 'u1',
        username: 'admin',
        displayName: 'admin',
        role: 'ADMINISTRATOR',
      });

      expect(token).toBe('signed.jwt.token');
    });
  });
});
