import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { NotFoundError, ConflictError, ValidationError } from '../../lib/errors';
import { resolveBranchScope } from '../../lib/branch-scope';

const leadSelect = {
  id: true,
  leadNumber: true,
  firstName: true,
  lastName: true,
  companyName: true,
  phone: true,
  email: true,
  whatsapp: true,
  source: true,
  status: true,
  estimatedBudget: true,
  budgetCurrencyCode: true,
  servicesInterested: true,
  description: true,
  notes: true,
  lostReason: true,
  convertedAt: true,
  branchId: true,
  assignedToUserId: true,
  interestedDestinationId: true,
  createdAt: true,
  assignedToUser: { select: { id: true, firstName: true, lastName: true } },
  interestedDestination: { select: { id: true, code: true, name: true, flagEmoji: true } },
  branch: { select: { id: true, name: true, code: true } },
};

export class LeadsService {
  async list(query: any, user: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null, ...resolveBranchScope(user, query) };
    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { leadNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: limit, select: leadSelect, orderBy: { createdAt: 'desc' } }),
      prisma.lead.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignedToUser: { select: { id: true, firstName: true, lastName: true } },
        interestedDestination: true,
        branch: { select: { id: true, name: true, code: true } },
        convertedCustomer: { select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true } },
        followUps: { where: { deletedAt: null }, orderBy: { scheduledAt: 'desc' as const }, take: 10 },
      },
    });
    if (!lead) throw new NotFoundError('Lead not found');
    return lead;
  }

  async create(data: any, user: any) {
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');

    const leadNumber = await generateSequenceId('lead');
    return prisma.lead.create({
      data: {
        leadNumber,
        branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        phone: data.phone,
        email: data.email || null,
        whatsapp: data.whatsapp,
        source: data.source,
        status: data.status || 'NEW',
        interestedDestinationId: data.interestedDestinationId || null,
        estimatedBudget: data.estimatedBudget ?? null,
        budgetCurrencyCode: data.budgetCurrencyCode || null,
        servicesInterested: data.servicesInterested,
        description: data.description,
        notes: data.notes,
        assignedToUserId: data.assignedToUserId || user.id,
        createdById: user.id,
      },
      select: leadSelect,
    });
  }

  async update(id: string, data: any) {
    const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundError('Lead not found');

    const { branchId, ...rest } = data;
    return prisma.lead.update({
      where: { id },
      data: rest,
      select: leadSelect,
    });
  }

  async delete(id: string) {
    const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundError('Lead not found');
    await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async convert(id: string, user: any, body: any) {
    const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundError('Lead not found');
    if (lead.convertedCustomerId) throw new ConflictError('Lead has already been converted');

    const customerNumber = await generateSequenceId('customer');

    const [customer] = await prisma.$transaction([
      prisma.customer.create({
        data: {
          customerNumber,
          branchId: body?.branchId || lead.branchId,
          customerType: lead.companyName ? 'COMPANY' : 'INDIVIDUAL',
          firstName: lead.firstName,
          lastName: lead.lastName,
          companyName: lead.companyName,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          email: lead.email,
          status: 'ACTIVE',
          source: lead.source,
          assignedToUserId: lead.assignedToUserId,
          createdById: user.id,
          notes: lead.notes,
        },
      }),
      prisma.lead.update({
        where: { id },
        data: {
          status: 'WON',
          convertedCustomerId: undefined,
          convertedAt: new Date(),
        },
      }),
    ]);

    // link back after customer exists
    await prisma.lead.update({ where: { id }, data: { convertedCustomerId: customer.id } });

    return prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true, customerNumber: true, firstName: true, lastName: true, companyName: true,
        phone: true, email: true, status: true,
      },
    });
  }

  async markLost(id: string, reason?: string) {
    const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundError('Lead not found');
    return prisma.lead.update({
      where: { id },
      data: { status: 'LOST', lostReason: reason || null },
      select: leadSelect,
    });
  }
}
