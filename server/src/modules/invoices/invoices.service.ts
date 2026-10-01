import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { fromCents, toCents } from '../../lib/money-math';

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'] as const;
export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];

async function loadOr404(id: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  return invoice;
}

/**
 * Recomputes subtotal/total/balanceDue and derives the payment-related status.
 * Single source of truth for invoice money state — payments service calls into it too.
 */
export async function recalcInvoice(invoiceId: string) {
  const [items, invoice] = await Promise.all([
    prisma.invoiceItem.findMany({ where: { invoiceId } }),
    loadOr404(invoiceId),
  ]);
  const subtotalCents = items.reduce((sum, item) => sum + toCents(item.lineTotal), 0);
  const totalCents = Math.max(subtotalCents - toCents(invoice.discount) + toCents(invoice.tax), 0);
  const paidCents = toCents(invoice.paidAmount);
  const balanceCents = Math.max(totalCents - paidCents, 0);

  let status = invoice.status;
  const closed = status === 'CANCELLED' || status === 'REFUNDED';
  if (!closed) {
    if (paidCents <= 0) {
      if (status === 'PARTIALLY_PAID' || status === 'PAID') status = 'SENT';
    } else if (paidCents >= totalCents) {
      status = 'PAID';
    } else if (['DRAFT', 'SENT', 'OVERDUE', 'PARTIALLY_PAID', 'PAID'].includes(status)) {
      status = 'PARTIALLY_PAID';
    }
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: fromCents(subtotalCents),
      totalAmount: fromCents(totalCents),
      balanceDue: fromCents(balanceCents),
      status,
    },
  });
}

class InvoicesService {
  async list(branchScope: { branchId?: string }, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { deletedAt: null, ...branchScope };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        payments: { where: { deletedAt: null }, orderBy: { paidAt: 'asc' as const } },
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });
    if (!invoice) throw new NotFoundError('Invoice not found');
    return invoice;
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
    const invoiceNumber = await generateSequenceId('invoice');
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        branchId,
        customerId: data.customerId,
        quotationId: data.quotationId ?? null,
        bookingId: data.bookingId ?? null,
        status: 'DRAFT',
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        currencyCode: data.currencyCode ?? 'USD',
        discount: fromCents(toCents(data.discount ?? 0)),
        tax: fromCents(toCents(data.tax ?? 0)),
        notes: data.notes ?? null,
        createdById: user.id,
        items: data.items?.length
          ? {
              create: data.items.map((item: any) => {
                const qty = item.quantity ?? 1;
                const cents = toCents(item.unitPrice ?? 0);
                return {
                  description: item.description,
                  quantity: qty,
                  unitPrice: fromCents(cents),
                  lineTotal: fromCents(cents * qty),
                };
              }),
            }
          : undefined,
      },
    });
    return recalcInvoice(invoice.id);
  }

  async update(id: string, data: any) {
    const invoice = await loadOr404(id);
    if (invoice.status !== 'DRAFT') throw new ConflictError('Only draft invoices can be edited');
    const payload: any = {};
    for (const key of ['customerId', 'bookingId', 'notes']) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (data.issueDate !== undefined) payload.issueDate = data.issueDate ? new Date(data.issueDate) : undefined;
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.discount !== undefined) payload.discount = fromCents(toCents(data.discount ?? 0));
    if (data.tax !== undefined) payload.tax = fromCents(toCents(data.tax ?? 0));
    const updated = await prisma.invoice.update({ where: { id }, data: payload });
    return recalcInvoice(updated.id);
  }

  async send(id: string) {
    const invoice = await loadOr404(id);
    if (invoice.status !== 'DRAFT') throw new ConflictError('Only draft invoices can be sent');
    return prisma.invoice.update({ where: { id }, data: { status: 'SENT', sentAt: invoice.sentAt ?? new Date() } });
  }

  async markOverdue(id: string) {
    const invoice = await loadOr404(id);
    if (invoice.status !== 'SENT') throw new ConflictError('Only sent invoices can be marked overdue');
    return prisma.invoice.update({ where: { id }, data: { status: 'OVERDUE' } });
  }

  async cancel(id: string) {
    const invoice = await loadOr404(id);
    if (toCents(invoice.paidAmount) > 0) throw new ConflictError('Invoices with payments cannot be cancelled');
    if (['CANCELLED', 'REFUNDED'].includes(invoice.status)) throw new ConflictError('Invoice is already closed');
    return prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
  }

  async addItem(invoiceId: string, data: any) {
    const invoice = await loadOr404(invoiceId);
    if (invoice.status !== 'DRAFT') throw new ConflictError('Items can only be added to draft invoices');
    const cents = toCents(data.unitPrice ?? 0);
    const qty = data.quantity ?? 1;
    await prisma.invoiceItem.create({
      data: {
        invoiceId,
        description: data.description,
        quantity: qty,
        unitPrice: fromCents(cents),
        lineTotal: fromCents(cents * qty),
      },
    });
    await recalcInvoice(invoiceId);
    return this.getById(invoiceId);
  }

  async updateItem(invoiceId: string, itemId: string, data: any) {
    const invoice = await loadOr404(invoiceId);
    if (invoice.status !== 'DRAFT') throw new ConflictError('Items can only be edited on draft invoices');
    const item = await prisma.invoiceItem.findFirst({ where: { id: itemId, invoiceId } });
    if (!item) throw new NotFoundError('Invoice item not found');
    const payload: any = {};
    if (data.description !== undefined) payload.description = data.description;
    if (data.quantity !== undefined) payload.quantity = data.quantity;
    if (data.unitPrice !== undefined) payload.unitPrice = fromCents(toCents(data.unitPrice ?? 0));
    await prisma.invoiceItem.update({ where: { id: itemId }, data: payload });
    const fresh = await prisma.invoiceItem.findUnique({ where: { id: itemId } });
    await prisma.invoiceItem.update({
      where: { id: itemId },
      data: { lineTotal: fromCents(toCents(fresh!.unitPrice) * fresh!.quantity) },
    });
    await recalcInvoice(invoiceId);
    return this.getById(invoiceId);
  }

  async deleteItem(invoiceId: string, itemId: string) {
    const invoice = await loadOr404(invoiceId);
    if (invoice.status !== 'DRAFT') throw new ConflictError('Items can only be removed from draft invoices');
    const item = await prisma.invoiceItem.findFirst({ where: { id: itemId, invoiceId } });
    if (!item) throw new NotFoundError('Invoice item not found');
    await prisma.invoiceItem.delete({ where: { id: itemId } });
    await recalcInvoice(invoiceId);
    return this.getById(invoiceId);
  }

  async delete(id: string) {
    const invoice = await loadOr404(id);
    if (toCents(invoice.paidAmount) > 0) throw new ConflictError('Invoices with payments cannot be deleted');
    const payments = await prisma.payment.count({ where: { invoiceId: id, deletedAt: null } });
    if (payments > 0) throw new ConflictError('Invoices with recorded payments cannot be deleted');
    await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const invoicesService = new InvoicesService();
