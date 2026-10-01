import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { fromCents, toCents } from '../../lib/money-math';

export const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;
export type QuotationStatusValue = (typeof QUOTATION_STATUSES)[number];

const STATUS_TRANSITIONS: Record<QuotationStatusValue, QuotationStatusValue[]> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

async function loadOr404(id: string) {
  const quotation = await prisma.quotation.findFirst({ where: { id, deletedAt: null } });
  if (!quotation) throw new NotFoundError('Quotation not found');
  return quotation;
}

async function recomputeTotals(quotationId: string) {
  const [items, quotation] = await Promise.all([
    prisma.quotationItem.findMany({ where: { quotationId } }),
    loadOr404(quotationId),
  ]);
  const subtotalCents = items.reduce((sum, item) => sum + toCents(item.lineTotal), 0);
  const totalCents = Math.max(subtotalCents - toCents(quotation.discount) + toCents(quotation.tax), 0);
  return prisma.quotation.update({
    where: { id: quotationId },
    data: { subtotal: fromCents(subtotalCents), totalAmount: fromCents(totalCents) },
  });
}

function itemCreateData(items: any[], currencyCode: string) {
  return items.map((item) => {
    const qty = item.quantity ?? 1;
    const cents = toCents(item.unitPrice ?? 0);
    return {
      itemType: item.itemType ?? 'OTHER',
      refId: item.refId ?? null,
      description: item.description,
      quantity: qty,
      unitPrice: fromCents(cents),
      lineTotal: fromCents(cents * qty),
    };
  });
}

class QuotationsService {
  async list(branchScope: { branchId?: string }, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { deletedAt: null, ...branchScope };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.search) {
      where.OR = [
        { quotationNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          items: true,
        },
      }),
      prisma.quotation.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const quotation = await prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });
    if (!quotation) throw new NotFoundError('Quotation not found');
    return quotation;
  }

  async create(user: any, data: any) {
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer not found');
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');
    if (data.bookingId) {
      const booking = await prisma.booking.findFirst({ where: { id: data.bookingId, deletedAt: null } });
      if (!booking) throw new NotFoundError('Booking not found');
    }
    const quotationNumber = await generateSequenceId('quotation');
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        branchId,
        customerId: data.customerId,
        bookingId: data.bookingId ?? null,
        status: 'DRAFT',
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        currencyCode: data.currencyCode ?? 'USD',
        discount: fromCents(toCents(data.discount ?? 0)),
        tax: fromCents(toCents(data.tax ?? 0)),
        notes: data.notes ?? null,
        createdById: user.id,
        items: data.items?.length ? { create: itemCreateData(data.items, data.currencyCode ?? 'USD') } : undefined,
      },
    });
    return recomputeTotals(quotation.id);
  }

  async update(id: string, data: any) {
    const quotation = await loadOr404(id);
    if (quotation.status !== 'DRAFT') throw new ConflictError('Only draft quotations can be edited');
    const payload: any = {};
    for (const key of ['customerId', 'bookingId', 'notes']) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (data.validUntil !== undefined) payload.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    if (data.discount !== undefined) payload.discount = fromCents(toCents(data.discount ?? 0));
    if (data.tax !== undefined) payload.tax = fromCents(toCents(data.tax ?? 0));
    const updated = await prisma.quotation.update({ where: { id }, data: payload });
    return recomputeTotals(updated.id);
  }

  async changeStatus(id: string, status: QuotationStatusValue) {
    const quotation = await loadOr404(id);
    if (status === 'CONVERTED') throw new ValidationError('Use the convert action to create an invoice');
    if (quotation.status === status) return quotation;
    if (!STATUS_TRANSITIONS[quotation.status as QuotationStatusValue]?.includes(status)) {
      throw new ValidationError(`Cannot move quotation from ${quotation.status} to ${status}`);
    }
    const data: any = { status };
    if (status === 'SENT' && !quotation.sentAt) data.sentAt = new Date();
    if (status === 'ACCEPTED') data.acceptedAt = new Date();
    return prisma.quotation.update({ where: { id }, data });
  }

  async convert(id: string, user: any) {
    const quotation = await loadOr404(id);
    if (quotation.status !== 'ACCEPTED') {
      throw new ConflictError('Only accepted quotations can be converted to an invoice');
    }
    const items = await prisma.quotationItem.findMany({ where: { quotationId: id } });
    const invoiceNumber = await generateSequenceId('invoice');
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        branchId: quotation.branchId,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        bookingId: quotation.bookingId,
        status: 'DRAFT',
        currencyCode: quotation.currencyCode,
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        tax: quotation.tax,
        totalAmount: quotation.totalAmount,
        balanceDue: quotation.totalAmount,
        notes: quotation.notes,
        createdById: user.id,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });
    await prisma.quotation.update({
      where: { id },
      data: { status: 'CONVERTED', convertedAt: new Date(), invoiceId: invoice.id },
    });
    return invoice;
  }

  async addItem(quotationId: string, data: any) {
    const quotation = await loadOr404(quotationId);
    if (quotation.status !== 'DRAFT') throw new ConflictError('Items can only be added to draft quotations');
    const cents = toCents(data.unitPrice ?? 0);
    const qty = data.quantity ?? 1;
    await prisma.quotationItem.create({
      data: {
        quotationId,
        itemType: data.itemType ?? 'OTHER',
        refId: data.refId ?? null,
        description: data.description,
        quantity: qty,
        unitPrice: fromCents(cents),
        lineTotal: fromCents(cents * qty),
      },
    });
    await recomputeTotals(quotationId);
    return this.getById(quotationId);
  }

  async updateItem(quotationId: string, itemId: string, data: any) {
    const quotation = await loadOr404(quotationId);
    if (quotation.status !== 'DRAFT') throw new ConflictError('Items can only be edited on draft quotations');
    const item = await prisma.quotationItem.findFirst({ where: { id: itemId, quotationId } });
    if (!item) throw new NotFoundError('Quotation item not found');
    const payload: any = {};
    for (const key of ['itemType', 'refId', 'description']) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (data.quantity !== undefined) payload.quantity = data.quantity;
    if (data.unitPrice !== undefined) payload.unitPrice = fromCents(toCents(data.unitPrice ?? 0));
    await prisma.quotationItem.update({ where: { id: itemId }, data: payload });
    const fresh = await prisma.quotationItem.findUnique({ where: { id: itemId } });
    await prisma.quotationItem.update({
      where: { id: itemId },
      data: { lineTotal: fromCents(toCents(fresh!.unitPrice) * fresh!.quantity) },
    });
    await recomputeTotals(quotationId);
    return this.getById(quotationId);
  }

  async deleteItem(quotationId: string, itemId: string) {
    const quotation = await loadOr404(quotationId);
    if (quotation.status !== 'DRAFT') throw new ConflictError('Items can only be removed from draft quotations');
    const item = await prisma.quotationItem.findFirst({ where: { id: itemId, quotationId } });
    if (!item) throw new NotFoundError('Quotation item not found');
    await prisma.quotationItem.delete({ where: { id: itemId } });
    await recomputeTotals(quotationId);
    return this.getById(quotationId);
  }

  async delete(id: string) {
    const quotation = await loadOr404(id);
    if (quotation.status === 'CONVERTED') throw new ConflictError('Converted quotations cannot be deleted');
    await prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const quotationsService = new QuotationsService();
