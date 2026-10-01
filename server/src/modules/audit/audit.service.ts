import { prisma } from '../../lib/prisma';
import { Prisma, AuditAction } from '@prisma/client';

export class AuditService {
  async getAuditLogs(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action as AuditAction;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      data,
      pagination: {
        page, limit, total, totalPages: Math.ceil(total / limit)
      }
    };
  }
}
