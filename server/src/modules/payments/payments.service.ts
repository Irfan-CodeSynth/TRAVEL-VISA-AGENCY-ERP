import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { fromCents, toCents } from '../../lib/money-math';
import { recalcInvoice } from '../invoices/invoices.service';
import { bookingsService } from '../bookings/bookings.service';

export const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'ADJUSTMENT'] as const;
export const PAYMENT_STATUSES = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'] as const;

async function loadOr404(id: string) {
  const payment = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
  if (!payment) throw new NotFoundError('Payment not found');
  return payment;
}

/** Applies a signed delta to invoice.paidAmount, the linked booking (if any) and all derived totals. */
async function applyToInvoice(invoiceId: string, deltaCents: number) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  const newPaidCents = Math.max(toCents(invoice.paidAmount) + deltaCents, 0);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: fromCents(newPaidCents) } });
  await recalcInvoice(invoiceId);

  if (invoice.bookingId) {
    const booking = await prisma.booking.findFirst({ where: { id: invoice.bookingId, deletedAt: null } });
    if (booking) {
      const newBookingPaid = Math.max(toCents(booking.paidAmount) + deltaCents, 0);
      await prisma.booking.update({ where: { id: booking.id }, data: { paidAmount: fromCents(newBookingPaid) } });
      await bookingsService.recordPaidAmount(booking.id, newBookingPaid / 100);
    }
  }
}

class PaymentsService {
  async list(branchScope: { branchId?: string }, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { deletedAt: null, ...branchScope };
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.method) where.method = query.method;
    if (query.status) where.status = query.status;
    if (query.isRefund === 'true') where.isRefund = true;
    if (query.isRefund === 'false') where.isRefund = false;
    if (query.search) {
      where.OR = [
        { paymentNumber: { contains: query.search, mode: 'insensitive' } },
        { reference: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, currencyCode: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const payment = await prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: { invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, currencyCode: true } } },
    });
    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  }

  async create(user: any, data: any) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (['DRAFT', 'CANCELLED', 'REFUNDED'].includes(invoice.status)) {
      throw new ConflictError(`Payments cannot be recorded against ${invoice.status.toLowerCase()} invoices`);
    }
    const amountCents = toCents(data.amount);
    if (amountCents <= 0) throw new ValidationError('Payment amount must be greater than zero');
    const balanceCents = Math.max(toCents(invoice.totalAmount) - toCents(invoice.paidAmount), 0);
    if (amountCents > balanceCents) {
      throw new ValidationError(`Payment exceeds balance due of ${fromCents(balanceCents)}`);
    }
    const paymentNumber = await generateSequenceId('payment');
    const status = data.status ?? 'COMPLETED';
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        branchId: invoice.branchId,
        invoiceId: invoice.id,
        customerId: data.customerId ?? invoice.customerId,
        amount: fromCents(amountCents),
        currencyCode: data.currencyCode ?? invoice.currencyCode,
        method: data.method ?? 'CASH',
        status,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        createdById: user.id,
      },
    });
    if (status === 'COMPLETED') await applyToInvoice(invoice.id, amountCents);
    return this.getById(payment.id);
  }

  async confirm(id: string) {
    const payment = await loadOr404(id);
    if (payment.status !== 'PENDING') throw new ConflictError('Only pending payments can be confirmed');
    await prisma.payment.update({ where: { id }, data: { status: 'COMPLETED' } });
    await applyToInvoice(payment.invoiceId, toCents(payment.amount));
    return this.getById(id);
  }

  async fail(id: string) {
    const payment = await loadOr404(id);
    if (payment.status === 'COMPLETED') throw new ConflictError('Completed payments cannot be failed; record a refund instead');
    await prisma.payment.update({ where: { id }, data: { status: 'FAILED' } });
    return this.getById(id);
  }

  /** Refund guard: a refund can never exceed what the payment paid nor what the invoice has actually received. */
  async refund(id: string, user: any, amount?: number) {
    const payment = await loadOr404(id);
    if (payment.isRefund) throw new ConflictError('Refund records cannot be refunded again');
    if (payment.status !== 'COMPLETED') throw new ConflictError('Only completed payments can be refunded');
    const refundableCents = toCents(payment.amount) - toCents(payment.refundedAmount);
    const invoice = await prisma.invoice.findFirst({ where: { id: payment.invoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundError('Invoice not found');
    const invoicePaidCents = toCents(invoice.paidAmount);
    const amountCents = amount === undefined ? refundableCents : toCents(amount);
    if (amountCents <= 0) throw new ValidationError('Refund amount must be greater than zero');
    if (amountCents > refundableCents) {
      throw new ValidationError(`Refund exceeds un-refunded payment amount of ${fromCents(refundableCents)}`);
    }
    if (amountCents > invoicePaidCents) {
      throw new ValidationError(`Refund exceeds total paid on invoice (${fromCents(invoicePaidCents)})`);
    }

    const paymentNumber = await generateSequenceId('payment');
    const refundPayment = await prisma.payment.create({
      data: {
        paymentNumber,
        branchId: payment.branchId,
        invoiceId: payment.invoiceId,
        customerId: payment.customerId,
        amount: fromCents(amountCents),
        currencyCode: payment.currencyCode,
        method: 'ADJUSTMENT',
        status: 'COMPLETED',
        paidAt: new Date(),
        reference: payment.paymentNumber,
        notes: `Refund of ${payment.paymentNumber}`,
        isRefund: true,
        createdById: user.id,
      },
    });

    const newRefunded = toCents(payment.refundedAmount) + amountCents;
    await prisma.payment.update({
      where: { id },
      data: {
        refundedAmount: fromCents(newRefunded),
        status: newRefunded >= toCents(payment.amount) ? 'REFUNDED' : 'COMPLETED',
      },
    });
    await applyToInvoice(payment.invoiceId, -amountCents);
    return this.getById(refundPayment.id);
  }

  async delete(id: string) {
    const payment = await loadOr404(id);
    if (payment.status === 'COMPLETED') {
      throw new ConflictError('Completed payments cannot be deleted; record a refund instead');
    }
    await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const paymentsService = new PaymentsService();
