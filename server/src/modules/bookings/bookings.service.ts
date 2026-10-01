import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';

export const BOOKING_STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export const BOOKING_TYPES = ['FLIGHT', 'HOTEL', 'PACKAGE', 'VISA', 'TRANSFER', 'TOUR', 'MIXED'] as const;

export const BOOKING_ITEM_TYPES = ['FLIGHT', 'HOTEL', 'PACKAGE', 'VISA', 'SERVICE', 'TRANSFER', 'TAX', 'OTHER'] as const;

const STATUS_TRANSITIONS: Record<BookingStatusValue, BookingStatusValue[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Integer-cents helpers keep Decimal(12,2) math exact.
const toCents = (value: any): number => Math.round(Number(value) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);

function derivePaymentStatus(paidCents: number, totalCents: number): string {
  if (paidCents <= 0) return 'UNPAID';
  if (paidCents >= totalCents) return 'PAID';
  return 'PARTIAL';
}

async function loadBookingOr404(id: string) {
  const booking = await prisma.booking.findFirst({ where: { id, deletedAt: null } });
  if (!booking) throw new NotFoundError('Booking not found');
  return booking;
}

async function recomputeTotals(bookingId: string) {
  const items = await prisma.bookingItem.findMany({ where: { bookingId } });
  const booking = await loadBookingOr404(bookingId);
  const subtotalCents = items.reduce((sum, item) => sum + toCents(item.lineTotal), 0);
  const totalCents = Math.max(subtotalCents - toCents(booking.discount) + toCents(booking.tax), 0);
  const paymentStatus = derivePaymentStatus(toCents(booking.paidAmount), totalCents);
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      subtotal: fromCents(subtotalCents),
      totalAmount: fromCents(totalCents),
      paymentStatus,
    },
  });
}

async function recomputeItemAndTotals(bookingId: string, itemId: string) {
  const item = await prisma.bookingItem.findUnique({ where: { id: itemId } });
  if (item) {
    const lineCents = toCents(item.unitPrice) * item.quantity;
    await prisma.bookingItem.update({ where: { id: itemId }, data: { lineTotal: fromCents(lineCents) } });
  }
  return recomputeTotals(bookingId);
}

class BookingsService {
  async list(user: any, branchScope: { branchId?: string }, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { deletedAt: null, ...branchScope };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.customerId) where.customerId = query.customerId;
    if (query.applicationId) where.applicationId = query.applicationId;
    if (query.search) {
      where.OR = [
        { bookingNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          items: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const booking = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: { items: { orderBy: { createdAt: 'asc' } }, customer: { select: { id: true, firstName: true, lastName: true, companyName: true } } },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    return booking;
  }

  async create(user: any, data: any) {
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer not found');
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');
    if (data.applicationId) {
      const app = await prisma.application.findFirst({ where: { id: data.applicationId, deletedAt: null } });
      if (!app) throw new NotFoundError('Application not found');
    }
    const bookingNumber = await generateSequenceId('booking');
    const discountCents = toCents(data.discount ?? 0);
    const taxCents = toCents(data.tax ?? 0);

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        branchId,
        type: data.type ?? 'FLIGHT',
        status: 'DRAFT',
        customerId: data.customerId,
        applicationId: data.applicationId ?? null,
        travelDate: data.travelDate ? new Date(data.travelDate) : null,
        returnDate: data.returnDate ? new Date(data.returnDate) : null,
        paxCount: data.paxCount ?? 1,
        currencyCode: data.currencyCode ?? 'USD',
        discount: fromCents(discountCents),
        tax: fromCents(taxCents),
        notes: data.notes ?? null,
        assignedToUserId: data.assignedToUserId ?? null,
        createdById: user.id,
        items: data.items?.length
          ? {
              create: data.items.map((item: any) => ({
                itemType: item.itemType ?? 'OTHER',
                refId: item.refId ?? null,
                description: item.description,
                quantity: item.quantity ?? 1,
                unitPrice: fromCents(toCents(item.unitPrice ?? 0)),
                lineTotal: fromCents(toCents(item.unitPrice ?? 0) * (item.quantity ?? 1)),
                currencyCode: item.currencyCode ?? data.currencyCode ?? 'USD',
                notes: item.notes ?? null,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
    return recomputeTotals(booking.id);
  }

  async update(id: string, data: any) {
    const booking = await loadBookingOr404(id);
    if (booking.status === 'CANCELLED') throw new ConflictError('Cancelled bookings cannot be edited');
    if (data.customerId && data.customerId !== booking.customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
      if (!customer) throw new NotFoundError('Customer not found');
    }
    const payload: any = {};
    for (const key of ['type', 'customerId', 'applicationId', 'paxCount', 'currencyCode', 'notes', 'assignedToUserId']) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (data.travelDate !== undefined) payload.travelDate = data.travelDate ? new Date(data.travelDate) : null;
    if (data.returnDate !== undefined) payload.returnDate = data.returnDate ? new Date(data.returnDate) : null;
    if (data.discount !== undefined) payload.discount = fromCents(toCents(data.discount ?? 0));
    if (data.tax !== undefined) payload.tax = fromCents(toCents(data.tax ?? 0));
    const updated = await prisma.booking.update({ where: { id }, data: payload });
    return recomputeTotals(updated.id);
  }

  async changeStatus(id: string, status: BookingStatusValue) {
    const booking = await loadBookingOr404(id);
    if (booking.status === status) return booking;
    if (!STATUS_TRANSITIONS[booking.status as BookingStatusValue]?.includes(status)) {
      throw new ValidationError(`Cannot move booking from ${booking.status} to ${status}`);
    }
    if (status === 'CANCELLED' && toCents(booking.paidAmount) > 0) {
      throw new ConflictError('Bookings with payments cannot be cancelled; record a refund first');
    }
    const updated = await prisma.booking.update({ where: { id }, data: { status } });
    if (status === 'CANCELLED') {
      const { flightFaresService } = await import('../flight-fares/flight-fares.service');
      await flightFaresService.restoreSeats(id);
    }
    if (status === 'CONFIRMED' || status === 'COMPLETED') return recomputeTotals(updated.id);
    return updated;
  }

  async addItem(bookingId: string, data: any) {
    const booking = await loadBookingOr404(bookingId);
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new ConflictError(`Items cannot be added to ${booking.status.toLowerCase()} bookings`);
    }
    const item = await prisma.bookingItem.create({
      data: {
        bookingId,
        itemType: data.itemType ?? 'OTHER',
        refId: data.refId ?? null,
        description: data.description,
        quantity: data.quantity ?? 1,
        unitPrice: fromCents(toCents(data.unitPrice ?? 0)),
        lineTotal: fromCents(toCents(data.unitPrice ?? 0) * (data.quantity ?? 1)),
        currencyCode: data.currencyCode ?? booking.currencyCode,
        notes: data.notes ?? null,
      },
    });
    await recomputeItemAndTotals(bookingId, item.id);
    return this.getById(bookingId);
  }

  async updateItem(bookingId: string, itemId: string, data: any) {
    const booking = await loadBookingOr404(bookingId);
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new ConflictError(`Items cannot be edited on ${booking.status.toLowerCase()} bookings`);
    }
    const item = await prisma.bookingItem.findFirst({ where: { id: itemId, bookingId } });
    if (!item) throw new NotFoundError('Booking item not found');
    const payload: any = {};
    for (const key of ['itemType', 'refId', 'description', 'notes', 'currencyCode']) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    if (data.quantity !== undefined) payload.quantity = data.quantity;
    if (data.unitPrice !== undefined) payload.unitPrice = fromCents(toCents(data.unitPrice ?? 0));
    await prisma.bookingItem.update({ where: { id: itemId }, data: payload });
    await recomputeItemAndTotals(bookingId, itemId);
    return this.getById(bookingId);
  }

  async deleteItem(bookingId: string, itemId: string) {
    const booking = await loadBookingOr404(bookingId);
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new ConflictError(`Items cannot be removed from ${booking.status.toLowerCase()} bookings`);
    }
    const item = await prisma.bookingItem.findFirst({ where: { id: itemId, bookingId } });
    if (!item) throw new NotFoundError('Booking item not found');
    await prisma.bookingItem.delete({ where: { id: itemId } });
    await recomputeTotals(bookingId);
    return this.getById(bookingId);
  }

  async delete(id: string) {
    const booking = await loadBookingOr404(id);
    if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
      throw new ConflictError('Confirmed or completed bookings cannot be deleted; cancel them first');
    }
    if (toCents(booking.paidAmount) > 0) {
      throw new ConflictError('Bookings with payments cannot be deleted');
    }
    const linked = await prisma.quotation.count({ where: { bookingId: id } });
    if (linked > 0) throw new ConflictError('Booking has linked quotations and cannot be deleted');
    await prisma.booking.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async recordPaidAmount(id: string, paidAmount: number) {
    const booking = await loadBookingOr404(id);
    const updated = await prisma.booking.update({ where: { id }, data: { paidAmount: fromCents(toCents(paidAmount)) } });
    return recomputeTotals(updated.id);
  }
}

export const bookingsService = new BookingsService();
