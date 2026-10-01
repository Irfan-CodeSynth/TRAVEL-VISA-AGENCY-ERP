import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { resolveBranchScope } from '../../lib/branch-scope';

const followUpSelect = {
  id: true,
  type: true,
  subject: true,
  notes: true,
  scheduledAt: true,
  completedAt: true,
  status: true,
  priority: true,
  branchId: true,
  customerId: true,
  leadId: true,
  assignedToUserId: true,
  createdAt: true,
  assignedToUser: { select: { id: true, firstName: true, lastName: true } },
  customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true, phone: true } },
  lead: { select: { id: true, leadNumber: true, firstName: true, lastName: true, companyName: true, phone: true } },
};

export class FollowUpsService {
  async list(query: any, user: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null, ...resolveBranchScope(user, query) };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.leadId) where.leadId = query.leadId;
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.followUp.findMany({ where, skip, take: limit, select: followUpSelect, orderBy: { scheduledAt: 'asc' } }),
      prisma.followUp.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const fu = await prisma.followUp.findFirst({ where: { id, deletedAt: null }, include: {
      customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true } },
      lead: { select: { id: true, leadNumber: true, firstName: true, lastName: true } },
    } });
    if (!fu) throw new NotFoundError('Follow-up not found');
    return fu;
  }

  async upcoming(query: any, user: any) {
    const days = parseInt(query.days) || 3;
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const scope = resolveBranchScope(user, query);
    const where: any = {
      deletedAt: null,
      status: 'PENDING',
      scheduledAt: { gte: now, lte: until },
      ...scope,
    };
    return prisma.followUp.findMany({ where, select: followUpSelect, orderBy: { scheduledAt: 'asc' } });
  }

  async overdue(query: any, user: any) {
    const scope = resolveBranchScope(user, query);
    const where: any = {
      deletedAt: null,
      status: 'PENDING',
      scheduledAt: { lt: new Date() },
      ...scope,
    };
    return prisma.followUp.findMany({ where, select: followUpSelect, orderBy: { scheduledAt: 'asc' } });
  }

  async create(data: any, user: any) {
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');
    return prisma.followUp.create({
      data: {
        branchId,
        type: data.type || 'CALL',
        subject: data.subject,
        notes: data.notes,
        scheduledAt: data.scheduledAt,
        status: data.status || 'PENDING',
        priority: data.priority || 'MEDIUM',
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        assignedToUserId: data.assignedToUserId || user.id,
        createdById: user.id,
      },
      select: followUpSelect,
    });
  }

  async update(id: string, data: any) {
    const fu = await prisma.followUp.findFirst({ where: { id, deletedAt: null } });
    if (!fu) throw new NotFoundError('Follow-up not found');
    const { branchId, ...rest } = data;
    if (rest.status === 'COMPLETED' && !rest.completedAt) rest.completedAt = new Date();
    return prisma.followUp.update({ where: { id }, data: rest, select: followUpSelect });
  }

  async complete(id: string) {
    const fu = await prisma.followUp.findFirst({ where: { id, deletedAt: null } });
    if (!fu) throw new NotFoundError('Follow-up not found');
    return prisma.followUp.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      select: followUpSelect,
    });
  }

  async delete(id: string) {
    const fu = await prisma.followUp.findFirst({ where: { id, deletedAt: null } });
    if (!fu) throw new NotFoundError('Follow-up not found');
    await prisma.followUp.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
