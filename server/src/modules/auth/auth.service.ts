import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { UnauthorizedError, NotFoundError } from '../../lib/errors';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { AuthResponse } from './auth.types';
import { LoginStatus } from '@prisma/client';

export class AuthService {
  async login(email: string, password: string, ipAddress: string, userAgent: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: true } }
      }
    });

    if (!user || !user.isActive) {
      if (user) {
        await prisma.loginHistory.create({
          data: { userId: user.id, ipAddress, userAgent, status: LoginStatus.FAILED, failureReason: 'Inactive account' }
        });
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await prisma.loginHistory.create({
        data: { userId: user.id, ipAddress, userAgent, status: LoginStatus.FAILED, failureReason: 'Invalid password' }
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    await prisma.loginHistory.create({
      data: { userId: user.id, ipAddress, userAgent, status: LoginStatus.SUCCESS }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const accessToken = generateAccessToken({ sub: user.id });
    const refreshToken = generateRefreshToken({ sub: user.id });
    
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        branchId: user.branchId,
      }
    };
  }

  async refresh(refreshToken: string, ipAddress: string, userAgent: string): Promise<AuthResponse> {
    const payload = verifyRefreshToken(refreshToken);
    
    const sessions = await prisma.userSession.findMany({
      where: { userId: payload.sub }
    });

    let validSessionId: string | null = null;

    for (const session of sessions) {
      if (session.expiresAt > new Date() && await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        validSessionId = session.id;
        break;
      }
    }

    if (!validSessionId) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Delete old session (rotation)
    await prisma.userSession.delete({ where: { id: validSessionId } });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    const newAccessToken = generateAccessToken({ sub: user.id });
    const newRefreshToken = generateRefreshToken({ sub: user.id });
    
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: newRefreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt
      }
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        branchId: user.branchId,
      }
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const sessions = await prisma.userSession.findMany({
        where: { userId: payload.sub }
      });

      for (const session of sessions) {
        if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
          await prisma.userSession.delete({ where: { id: session.id } });
          break;
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, gender: true,
        branch: { select: { id: true, name: true } },
        userRoles: {
          select: {
            role: {
              select: {
                name: true, displayName: true,
                rolePermissions: { select: { permission: { select: { module: true, action: true } } } }
              }
            }
          }
        },
        branchUserRoles: {
          select: {
            role: {
              select: {
                name: true, displayName: true,
                rolePermissions: { select: { permission: { select: { module: true, action: true } } } }
              }
            },
            branch: { select: { id: true, name: true } }
          }
        }
      }
    });
    if (!user) throw new NotFoundError('User not found');

    // Flatten permissions into a simple array for the frontend
    const permissions = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissions.add(`${rp.permission.module}.${rp.permission.action}`);
      }
    }
    for (const bur of user.branchUserRoles) {
      for (const rp of bur.role.rolePermissions) {
        permissions.add(`${rp.permission.module}.${rp.permission.action}`);
      }
    }

    return {
      ...user,
      permissions: Array.from(permissions),
      roles: user.userRoles.map(ur => ur.role.displayName),
    };
  }

  async updateProfile(userId: string, data: any) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true }
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid old password');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      }),
      // Invalidate all sessions to force re-login
      prisma.userSession.deleteMany({
        where: { userId }
      })
    ]);
  }
}
