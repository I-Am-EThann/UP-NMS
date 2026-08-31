export interface JwtPayload {
  sub: string; // user id
  username: string;
  displayName: string;
  role: 'ADMINISTRATOR';
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMINISTRATOR';
}
