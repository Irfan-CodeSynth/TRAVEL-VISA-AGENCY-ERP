import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export interface TokenPayload {
  sub: string;
  [key: string]: unknown;
}

export const generateAccessToken = (payload: Omit<TokenPayload, 'jti'>): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    jwtid: uuidv4(),
  };
  return jwt.sign(payload, config.jwt.accessSecret, options);
};

export const generateRefreshToken = (payload: Omit<TokenPayload, 'jti'>): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    jwtid: uuidv4(),
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
};

export const verifyAccessToken = (token: string): TokenPayload & { jti: string } => {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as TokenPayload & { jti: string };
};

export const verifyRefreshToken = (token: string): TokenPayload & { jti: string } => {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as TokenPayload & { jti: string };
};
