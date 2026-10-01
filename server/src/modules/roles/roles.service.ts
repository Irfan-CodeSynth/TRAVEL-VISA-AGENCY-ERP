import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/errors';

export class RolesService {
  async list() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async listPermissions() {
    return prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });
  }

  async getById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
    if (!role) throw new NotFoundError('Role not found');
    return role;
  }

  async create(data: any) {
    const existing = await prisma.role.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError('Role name already exists');

    return prisma.role.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        roleType: data.roleType,
      }
    });
  }

  async update(id: string, data: any) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new ForbiddenError('Cannot modify system role');

    if (data.name && data.name !== role.name) {
      const existing = await prisma.role.findUnique({ where: { name: data.name } });
      if (existing) throw new ConflictError('Role name already exists');
    }

    return prisma.role.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { userRoles: true, branchUserRoles: true } } } });
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) throw new ForbiddenError('Cannot delete system role');
    if (role._count.userRoles > 0 || role._count.branchUserRoles > 0) {
      throw new ConflictError('Cannot delete role assigned to users');
    }

    return prisma.role.delete({ where: { id } });
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem && role.name === 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot modify permissions for Super Admin');
    }

    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({ roleId, permissionId }))
        });
      }
    });
  }
}
