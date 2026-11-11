export interface AuthenticatedUser {
  id: string;
  email: string;
  tokenId: string;
  expiresAt: number;
  token: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  jti: string;
  exp: number;
}
