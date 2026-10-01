import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { resolveBranchScope } from '../../lib/branch-scope';

const customerSelect = {
  id: true,
  customerNumber: true,
  customerType: true,
  firstName: true,
  lastName: true,
  companyName: true,
  phone: true,
  whatsapp: true,
  email: true,
  passportNumber: true,
  passportExpiry: true,
  city: true,
  status: true,
  source: true,
  branchId: true,
  assignedToUserId: true,
  nationalityCountryId: true,
  createdAt: true,
  assignedToUser: { select: { id: true, firstName: true, lastName: true } },
  nationalityCountry: { select: { id: true, code: true, name: true, flagEmoji: true } },
  branch: { select: { id: true, name: true, code: true } },
};

export class CustomersService {
  async list(query: any, user: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null, ...resolveBranchScope(user, query) };
    if (query.status) where.status = query.status;
    if (query.customerType) where.customerType = query.customerType;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { customerNumber: { contains: query.search, mode: 'insensitive' } },
        { passportNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: limit, select: customerSelect, orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignedToUser: { select: { id: true, firstName: true, lastName: true } },
        nationalityCountry: true,
        branch: { select: { id: true, name: true, code: true } },
        lead: { select: { id: true, leadNumber: true, source: true } },
      },
    });
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  async getSummary(id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: customerSelect,
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const [followUpsOpen, followUpsTotal, recentFollowUps] = await Promise.all([
      prisma.followUp.count({ where: { customerId: id, status: 'PENDING', deletedAt: null } }),
      prisma.followUp.count({ where: { customerId: id, deletedAt: null } }),
      prisma.followUp.findMany({
        where: { customerId: id, deletedAt: null },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      customer,
      stats: {
        followUpsOpen,
        followUpsTotal,
      },
      recentFollowUps,
    };
  }

  async create(data: any, user: any) {
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');

    const customerNumber = await generateSequenceId('customer');
    return prisma.customer.create({
      data: {
        customerNumber,
        branchId,
        customerType: data.customerType || 'INDIVIDUAL',
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email || null,
        nationalId: data.nationalId,
        passportNumber: data.passportNumber,
        passportExpiry: data.passportExpiry,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        nationalityCountryId: data.nationalityCountryId || null,
        occupation: data.occupation,
        city: data.city,
        address: data.address,
        status: data.status || 'ACTIVE',
        source: data.source,
        assignedToUserId: data.assignedToUserId || user.id,
        createdById: user.id,
        notes: data.notes,
      },
      select: customerSelect,
    });
  }

  async update(id: string, data: any) {
    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer not found');

    const { branchId, customerNumber, ...rest } = data;
    return prisma.customer.update({
      where: { id },
      data: rest,
      select: customerSelect,
    });
  }

  async delete(id: string) {
    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer not found');
    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
