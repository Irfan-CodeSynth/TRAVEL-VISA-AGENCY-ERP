import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors';
import { resolveBranchScope } from '../../lib/branch-scope';
import { APPLICATION_STATUSES } from './applications.validators';

type AppStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'AT_EMBASSY', 'ADDITIONAL_DOCS', 'WITHDRAWN'],
  UNDER_REVIEW: ['AT_EMBASSY', 'ADDITIONAL_DOCS', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
  AT_EMBASSY: ['ADDITIONAL_DOCS', 'APPROVED', 'REJECTED', 'RETURNED'],
  ADDITIONAL_DOCS: ['UNDER_REVIEW', 'AT_EMBASSY', 'WITHDRAWN'],
  APPROVED: [],
  REJECTED: [],
  RETURNED: ['SUBMITTED', 'UNDER_REVIEW', 'WITHDRAWN'],
  WITHDRAWN: [],
};

const DECISION_STATUSES: AppStatus[] = ['APPROVED', 'REJECTED'];

function userHasPermission(user: any, permission: string): boolean {
  const [module, action] = permission.split('.');
  const roleArrays = [user?.userRoles ?? [], user?.branchUserRoles ?? []];
  for (const roles of roleArrays) {
    for (const ur of roles) {
      for (const rp of ur.role?.rolePermissions ?? []) {
        if (rp.permission?.module === module && rp.permission?.action === action) return true;
      }
    }
  }
  return false;
}

const applicationSelect = {
  id: true,
  applicationNumber: true,
  status: true,
  applicantCount: true,
  submissionDate: true,
  decisionDate: true,
  referenceNumber: true,
  totalFees: true,
  currencyCode: true,
  notes: true,
  branchId: true,
  assignedToUserId: true,
  customerId: true,
  visaTypeId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true, phone: true } },
  visaType: { select: { id: true, code: true, name: true, category: true, country: { select: { id: true, code: true, name: true, flagEmoji: true } } } },
};

export class ApplicationsService {
  async list(query: any, user: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = { deletedAt: null, ...resolveBranchScope(user, query) };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.visaTypeId) where.visaTypeId = query.visaTypeId;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.search) {
      where.OR = [
        { applicationNumber: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({ where, skip, take: limit, select: applicationSelect, orderBy: { createdAt: 'desc' } }),
      prisma.application.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const application = await prisma.application.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true, phone: true, email: true } },
        visaType: { include: { country: { select: { id: true, code: true, name: true, flagEmoji: true } } } },
        statusLogs: { orderBy: { createdAt: 'asc' } },
        appointments: { where: { deletedAt: null }, orderBy: { scheduledAt: 'asc' as const } },
      },
    });
    if (!application) throw new NotFoundError('Application not found');
    return application;
  }

  async create(data: any, user: any) {
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
    if (!customer) throw new ValidationError('Customer not found');
    const visaType = await prisma.visaType.findFirst({ where: { id: data.visaTypeId, deletedAt: null } });
    if (!visaType) throw new ValidationError('Visa type not found');

    const applicationNumber = await generateSequenceId('application');
    return prisma.application.create({
      data: {
        applicationNumber,
        branchId,
        customerId: data.customerId,
        visaTypeId: data.visaTypeId,
        applicantCount: data.applicantCount ?? 1,
        referenceNumber: data.referenceNumber ?? null,
        totalFees: data.totalFees ?? null,
        currencyCode: data.currencyCode ?? 'USD',
        notes: data.notes ?? null,
        assignedToUserId: data.assignedToUserId ?? user.id,
        createdById: user.id,
        statusLogs: { create: { toStatus: 'DRAFT', note: 'Application created', changedByUserId: user.id } },
      },
      select: applicationSelect,
    });
  }

  async update(id: string, data: any) {
    const application = await prisma.application.findFirst({ where: { id, deletedAt: null } });
    if (!application) throw new NotFoundError('Application not found');
    const { branchId, customerId, visaTypeId, status, ...rest } = data;
    return prisma.application.update({ where: { id }, data: rest, select: applicationSelect });
  }

  async changeStatus(id: string, status: AppStatus, note: string | undefined, user: any) {
    const application = await prisma.application.findFirst({ where: { id, deletedAt: null } });
    if (!application) throw new NotFoundError('Application not found');

    const from = application.status as AppStatus;
    if (from === status) throw new ValidationError(`Application is already ${from.toLowerCase().replace(/_/g, ' ')}`);
    if (!STATUS_TRANSITIONS[from]?.includes(status)) {
      throw new ValidationError(
        `Cannot move application from ${from.replace(/_/g, ' ')} to ${status.replace(/_/g, ' ')}`
      );
    }
    if (status === 'SUBMITTED' && !userHasPermission(user, 'applications.submit')) {
      throw new ForbiddenError('Missing required permission: applications.submit');
    }

    const data: Prisma.ApplicationUpdateInput = {
      status,
      statusLogs: { create: { fromStatus: from, toStatus: status, note: note ?? null, changedByUserId: user.id } },
    };
    if (status === 'SUBMITTED' && !application.submissionDate) data.submissionDate = new Date();
    if (DECISION_STATUSES.includes(status) && !application.decisionDate) data.decisionDate = new Date();

    return prisma.application.update({ where: { id }, data, select: applicationSelect });
  }

  async timeline(id: string) {
    const application = await prisma.application.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, createdAt: true },
    });
    if (!application) throw new NotFoundError('Application not found');

    const [logs, appointments] = await Promise.all([
      prisma.applicationStatusLog.findMany({
        where: { applicationId: id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.appointment.findMany({
        where: { applicationId: id, deletedAt: null },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, type: true, status: true, subject: true, scheduledAt: true, location: true },
      }),
    ]);

    const events = [
      { kind: 'CREATED' as const, at: application.createdAt, note: 'Application created' },
      ...logs.map((l) => ({ kind: 'STATUS' as const, at: l.createdAt, note: l.note, fromStatus: l.fromStatus, toStatus: l.toStatus })),
      ...appointments.map((a) => ({ kind: 'APPOINTMENT' as const, at: a.scheduledAt, appointment: a })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return events;
  }

  async delete(id: string) {
    const application = await prisma.application.findFirst({ where: { id, deletedAt: null } });
    if (!application) throw new NotFoundError('Application not found');
    await prisma.application.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async stats(user: any, query: any) {
    const where: Prisma.ApplicationWhereInput = { deletedAt: null, ...resolveBranchScope(user, query) };
    const [byStatus, total, recent] = await Promise.all([
      prisma.application.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          applicationNumber: true,
          status: true,
          updatedAt: true,
          customer: { select: { firstName: true, lastName: true, companyName: true } },
          visaType: { select: { name: true, country: { select: { name: true, flagEmoji: true } } } },
        },
      }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const s of APPLICATION_STATUSES) statusCounts[s] = 0;
    for (const row of byStatus) statusCounts[row.status] = row._count._all;
    return { total, statusCounts, recent };
  }
}
