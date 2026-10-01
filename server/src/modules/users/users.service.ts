import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../lib/errors';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

export class UsersService {
  async list(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { deletedAt: null };
    
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    
    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.roleId) {
      where.userRoles = { some: { roleId: query.roleId } };
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true,
          branch: { select: { id: true, name: true } },
          userRoles: { select: { role: { select: { id: true, name: true, displayName: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      data,
      pagination: {
        page, limit, total, totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, gender: true, isActive: true, branchId: true,
        userRoles: { select: { roleId: true } },
        branchUserRoles: { select: { roleId: true, branchId: true } }
      }
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async create(data: any) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 12);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          gender: data.gender,
          branchId: data.branchId,
          isActive: data.isActive ?? true,
        }
      });

      if (data.roleIds && data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId: string) => ({ userId: user.id, roleId }))
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
    });
  }

  async update(id: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictError('Email already in use');
    }

    const updateData: any = { ...data };
    delete updateData.roleIds;
    delete updateData.password;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    return prisma.$transaction(async (tx) => {
      if (data.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId: string) => ({ userId: id, roleId }))
        });
      }

      return tx.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, firstName: true, lastName: true }
      });
    });
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false,
        email: `${user.email}.deleted.${Date.now()}` // free up email
      }
    });
  }
}
