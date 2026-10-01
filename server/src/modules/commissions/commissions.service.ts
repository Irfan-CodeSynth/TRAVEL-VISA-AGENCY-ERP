import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { fromCents, toCents } from '../../lib/money-math';

export const COMMISSION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;
export type CommissionStatusValue = (typeof COMMISSION_STATUSES)[number];

const STATUS_TRANSITIONS: Record<CommissionStatusValue, CommissionStatusValue[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'REJECTED'],
  PAID: [],
  REJECTED: [],
};

function computeAmountCents(type: string, rate: number, baseCents: number): number {
  if (type === 'PERCENTAGE') return Math.round((baseCents * rate) / 100);
  return toCents(rate);
}

async function loadOr404(id: string) {
  const commission = await prisma.commission.findFirst({ where: { id, deletedAt: null } });
  if (!commission) throw new NotFoundError('Commission not found');
  return commission;
}

const includeRefs = {
  agent: { select: { id: true, name: true } },
  booking: { select: { id: true, bookingNumber: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
} as const;

class CommissionsService {
  async list(branchScope: { branchId?: string }, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { deletedAt: null, ...branchScope };
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.search) {
      where.OR = [
        { commissionNumber: { contains: query.search, mode: 'insensitive' } },
        { agent: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: includeRefs,
      }),
      prisma.commission.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const commission = await prisma.commission.findFirst({
      where: { id, deletedAt: null },
      include: includeRefs,
    });
    if (!commission) throw new NotFoundError('Commission not found');
    return commission;
  }

  async create(user: any, data: any) {
    const agent = await prisma.agent.findFirst({ where: { id: data.agentId, deletedAt: null } });
    if (!agent) throw new NotFoundError('Agent not found');
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');

    let baseCents = toCents(data.baseAmount ?? 0);
    if (data.bookingId) {
      const booking = await prisma.booking.findFirst({ where: { id: data.bookingId, deletedAt: null } });
      if (!booking) throw new NotFoundError('Booking not found');
      if (!data.baseAmount) baseCents = toCents(booking.totalAmount);
    } else if (data.invoiceId) {
      const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, deletedAt: null } });
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (!data.baseAmount) baseCents = toCents(invoice.totalAmount);
    }

    const type = data.type ?? agent.commissionType;
    const rate = data.rate !== undefined ? Number(data.rate) : Number(agent.commissionRate);
    const amountCents = computeAmountCents(type, rate, baseCents);

    const commissionNumber = await generateSequenceId('commission');
    const commission = await prisma.commission.create({
      data: {
        commissionNumber,
        branchId,
        agentId: agent.id,
        bookingId: data.bookingId ?? null,
        invoiceId: data.invoiceId ?? null,
        type,
        rate: String(rate),
        baseAmount: fromCents(baseCents),
        amount: fromCents(amountCents),
        currencyCode: data.currencyCode ?? agent.currencyCode ?? 'USD',
        status: 'PENDING',
        notes: data.notes ?? null,
        createdById: user.id,
      },
      include: includeRefs,
    });
    return commission;
  }

  /** Idempotent auto-generation: one live commission per (booking, agent) in PENDING/APPROVED/PAID. */
  async generateFromBooking(user: any, bookingId: string, agentId: string) {
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, deletedAt: null } });
    if (!booking) throw new NotFoundError('Booking not found');
    const existing = await prisma.commission.findFirst({
      where: { bookingId, agentId, status: { not: 'REJECTED' }, deletedAt: null },
    });
    if (existing) throw new ConflictError('A commission already exists for this booking and agent');
    return this.create(user, { agentId, bookingId });
  }

  async changeStatus(id: string, status: CommissionStatusValue, userId: string) {
    const commission = await loadOr404(id);
    if (commission.status === status) return this.getById(id);
    if (!STATUS_TRANSITIONS[commission.status].includes(status)) {
      throw new ValidationError(`Cannot move commission from ${commission.status} to ${status}`);
    }
    const data: any = { status };
    if (status === 'APPROVED') {
      data.approvedByUserId = userId;
      data.approvedAt = new Date();
    }
    if (status === 'PAID') data.paidAt = new Date();
    await prisma.commission.update({ where: { id }, data });
    return this.getById(id);
  }

  async delete(id: string) {
    const commission = await loadOr404(id);
    if (commission.status === 'PAID') throw new ConflictError('Paid commissions cannot be deleted');
    await prisma.commission.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const commissionsService = new CommissionsService();
