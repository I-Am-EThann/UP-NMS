import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from './types/jwt-payload.interface';

// Minimal shape we rely on from the `users` table. Cast to this once right
// after the Prisma call below, instead of scattering `any`-access disables
// through the rest of the method. Once `prisma generate` has run, this cast
// becomes redundant (the real generated type is a strict superset) but is
// still perfectly valid.
interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'ADMINISTRATOR';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const found: unknown = await this.prisma.user.findUnique({
      where: { username },
    });
    const user = found as UserRecord | null;

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  }

  issueToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
    return this.jwt.sign(payload);
  }
}
