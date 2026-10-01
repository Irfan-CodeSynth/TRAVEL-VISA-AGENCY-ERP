import { Prisma, MarginType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';

const toCents = (value: any): number => Math.round(Number(value) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);
const round2 = (n: number) => Number(fromCents(Math.round(n * 100)));

// A fare manager (anyone allowed to create/edit fares) must see the base cost and
// margin they enter; pure counter staff (flights.view only) see just the selling price.
export function canSeeMargin(user: any): boolean {
  const perms = new Set<string>();
  for (const ur of [...(user?.userRoles ?? []), ...(user?.branchUserRoles ?? [])]) {
    for (const rp of ur.role?.rolePermissions ?? []) {
      perms.add(`${rp.permission.module}.${rp.permission.action}`);
    }
  }
  return perms.has('flights.create') || perms.has('flights.edit');
}

type Margin = { type: MarginType; value: number };

async function globalMarginDefault(): Promise<Margin | null> {
  const setting = await prisma.setting.findFirst({ where: { group: 'flights', key: 'defaultMargin', branchId: null } });
  const v: any = setting?.value;
  if (v && (v.type === 'PERCENT' || v.type === 'FLAT') && Number.isFinite(Number(v.value))) {
    return { type: v.type, value: Number(v.value) };
  }
  return null;
}

function fareMargin(fare: any, airline: any, globalDefault: Margin | null): Margin | null {
  if (fare.marginType && fare.marginValue != null) return { type: fare.marginType, value: Number(fare.marginValue) };
  if (airline?.defaultMarginType && airline?.defaultMarginValue != null) {
    return { type: airline.defaultMarginType, value: Number(airline.defaultMarginValue) };
  }
  return globalDefault;
}

function applyMargin(base: number, margin: Margin | null): number {
  if (!margin) return round2(base);
  return margin.type === 'PERCENT' ? round2(base * (1 + margin.value / 100)) : round2(base + margin.value);
}

const fareInclude = {
  airline: true,
  originAirport: true,
  destinationAirport: true,
} satisfies Prisma.FlightFareInclude;

type RawFare = Prisma.FlightFareGetPayload<{ include: typeof fareInclude }>;

function serializeFare(fare: RawFare, margin: Margin | null, selling: number, viewerSeesMargin: boolean) {
  const seatsLeft = fare.seatsTotal > 0 ? Math.max(0, fare.seatsTotal - fare.seatsBooked) : null;
  const base: any = {
    id: fare.id,
    airlineId: fare.airlineId,
    airline: fare.airline,
    flightNumber: fare.flightNumber,
    originAirportId: fare.originAirportId,
    originAirport: fare.originAirport,
    destinationAirportId: fare.destinationAirportId,
    destinationAirport: fare.destinationAirport,
    departureTime: fare.departureTime,
    arrivalTime: fare.arrivalTime,
    cabinClass: fare.cabinClass,
    currencyCode: fare.currencyCode,
    taxPercent: fare.taxPercent,
    seatsTotal: fare.seatsTotal,
    seatsBooked: fare.seatsBooked,
    seatsLeft,
    sellingPrice: selling,
    notes: fare.notes,
    isActive: fare.isActive,
    createdAt: fare.createdAt,
    updatedAt: fare.updatedAt,
  };
  if (viewerSeesMargin) {
    base.baseFare = fare.baseFare;
    base.marginType = margin?.type ?? null;
    base.marginValue = margin?.value ?? null;
    base.marginApplied = margin ? round2(selling - Number(fare.baseFare)) : 0;
  }
  return base;
}

async function loadAndSerialize(fares: RawFare[], viewerSeesMargin: boolean) {
  const globalDefault = await globalMarginDefault();
  return fares.map((f) => {
    const margin = fareMargin(f, f.airline, globalDefault);
    const selling = applyMargin(Number(f.baseFare), margin);
    return serializeFare(f, margin, selling, viewerSeesMargin);
  });
}

const notDeleted = { deletedAt: null };

class FlightFaresService {
  async list(query: any, viewerSeesMargin: boolean) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { ...notDeleted };
    if (query.airlineId) where.airlineId = query.airlineId;
    if (query.cabinClass) where.cabinClass = query.cabinClass;
    if (query.isActive === 'true') where.isActive = true;
    if (query.upcoming === 'true') where.departureTime = { gte: new Date() };
    if (query.fromAirportId || query.toAirportId) {
      if (query.fromAirportId) where.originAirportId = query.fromAirportId;
      if (query.toAirportId) where.destinationAirportId = query.toAirportId;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { flightNumber: { contains: s, mode: 'insensitive' } },
        { airline: { name: { contains: s, mode: 'insensitive' } } },
        { airline: { code: { contains: s, mode: 'insensitive' } } },
      ];
    }
    const [fares, total] = await Promise.all([
      prisma.flightFare.findMany({
        where,
        include: fareInclude,
        orderBy: { departureTime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.flightFare.count({ where }),
    ]);
    return { data: await loadAndSerialize(fares, viewerSeesMargin), total, page, limit };
  }

  async search(query: any, viewerSeesMargin: boolean) {
    const where: any = { ...notDeleted, isActive: true };
    if (query.fromCode) where.originAirport = { iataCode: String(query.fromCode).toUpperCase() };
    if (query.toCode) where.destinationAirport = { iataCode: String(query.toCode).toUpperCase() };
    if (query.cabinClass) where.cabinClass = query.cabinClass;
    if (query.date) {
      const from = new Date(`${String(query.date)}T00:00:00.000Z`);
      if (isNaN(from.getTime())) throw new ValidationError('Invalid date');
      const to = new Date(from.getTime() + 24 * 3600 * 1000);
      where.departureTime = { gte: from, lt: to };
    } else {
      where.departureTime = { gte: new Date() };
    }
    const fares = await prisma.flightFare.findMany({ where, include: fareInclude, orderBy: { departureTime: 'asc' }, take: 100 });
    const serialized = await loadAndSerialize(fares, viewerSeesMargin);
    return query.pax ? serialized.filter((f: any) => f.seatsLeft === null || f.seatsLeft >= Number(query.pax)) : serialized;
  }

  async getById(id: string, viewerSeesMargin: boolean) {
    const fare = await prisma.flightFare.findFirst({ where: { id, ...notDeleted }, include: fareInclude });
    if (!fare) throw new NotFoundError('Fare not found');
    return (await loadAndSerialize([fare], viewerSeesMargin))[0];
  }

  async create(data: any) {
    await this.assertRefs(data);
    const dup = data.airlineId && data.flightNumber && data.originAirportId && data.destinationAirportId && data.departureTime && data.cabinClass
      ? await prisma.flightFare.findUnique({
          where: {
            airlineId_flightNumber_originAirportId_destinationAirportId_departureTime_cabinClass: {
              airlineId: data.airlineId,
              flightNumber: data.flightNumber,
              originAirportId: data.originAirportId,
              destinationAirportId: data.destinationAirportId,
              departureTime: new Date(data.departureTime),
              cabinClass: data.cabinClass ?? 'ECONOMY',
            },
          },
        })
      : null;
    if (dup) throw new ConflictError('A fare for this flight, route, time and class already exists');
    const fare = await prisma.flightFare.create({
      data: {
        airlineId: data.airlineId,
        flightNumber: data.flightNumber,
        originAirportId: data.originAirportId,
        destinationAirportId: data.destinationAirportId,
        departureTime: new Date(data.departureTime),
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
        cabinClass: data.cabinClass ?? 'ECONOMY',
        baseFare: fromCents(toCents(data.baseFare)),
        currencyCode: data.currencyCode ?? 'USD',
        marginType: data.marginType ?? null,
        marginValue: data.marginValue != null && data.marginType != null ? fromCents(toCents(data.marginValue)) : null,
        taxPercent: fromCents(toCents(data.taxPercent ?? 0)),
        seatsTotal: data.seatsTotal ?? 0,
        notes: data.notes ?? null,
      },
      include: fareInclude,
    });
    return (await loadAndSerialize([fare], true))[0];
  }

  async update(id: string, data: any) {
    const fare = await prisma.flightFare.findFirst({ where: { id, ...notDeleted } });
    if (!fare) throw new NotFoundError('Fare not found');
    await this.assertRefs(data, fare);
    const patch: any = { ...data };
    if (data.departureTime) patch.departureTime = new Date(data.departureTime);
    if (data.arrivalTime) patch.arrivalTime = new Date(data.arrivalTime);
    if (data.baseFare != null) patch.baseFare = fromCents(toCents(data.baseFare));
    if (data.marginValue != null && data.marginValue !== null) patch.marginValue = fromCents(toCents(data.marginValue));
    if (data.taxPercent != null) patch.taxPercent = fromCents(toCents(data.taxPercent));
    if (data.marginType === undefined) delete patch.marginType;
    if (data.marginValue === undefined) delete patch.marginValue;
    if ((patch.marginType == null) !== (fare.marginType == null) || patch.marginValue != null) {
      const type = patch.marginType ?? fare.marginType;
      const value = patch.marginValue != null ? Number(patch.marginValue) : fare.marginValue;
      if (type == null || value == null) {
        patch.marginType = null;
        patch.marginValue = null;
      }
    }
    const updated = await prisma.flightFare.update({ where: { id }, data: patch, include: fareInclude });
    return (await loadAndSerialize([updated], true))[0];
  }

  async delete(id: string) {
    const fare = await prisma.flightFare.findFirst({ where: { id, ...notDeleted } });
    if (!fare) throw new NotFoundError('Fare not found');
    await prisma.flightFare.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async sell(user: any, fareId: string, data: any) {
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer not found');
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');
    const pax = data.pax ?? 1;
    const fare = await prisma.flightFare.findFirst({ where: { id: fareId, ...notDeleted }, include: fareInclude });
    if (!fare) throw new NotFoundError('Fare not found');
    if (!fare.isActive) throw new ConflictError('This fare is not active');
    if (fare.seatsTotal > 0 && fare.seatsBooked + pax > fare.seatsTotal) {
      throw new ConflictError(`Only ${Math.max(0, fare.seatsTotal - fare.seatsBooked)} seat(s) left on this flight`);
    }
    const globalDefault = await globalMarginDefault();
    const margin = fareMargin(fare, fare.airline, globalDefault);
    const selling = applyMargin(Number(fare.baseFare), margin);
    const subtotal = round2(selling * pax);
    const tax = round2((subtotal * Number(fare.taxPercent)) / 100);
    const total = round2(subtotal + tax);
    const description = `${fare.airline.code} ${fare.flightNumber} ${fare.originAirport.iataCode}\u2192${fare.destinationAirport.iataCode} ${fare.cabinClass.replace('_', ' ')}`;
    const bookingNumber = await generateSequenceId('booking');

    const booking = await prisma.$transaction(async (tx) => {
      if (fare.seatsTotal > 0) {
        const upd = await tx.flightFare.updateMany({
          where: { id: fare.id, seatsTotal: { gt: 0 }, seatsBooked: { lte: fare.seatsTotal - pax } },
          data: { seatsBooked: { increment: pax } },
        });
        if (upd.count === 0) throw new ConflictError('Not enough seats left on this flight');
      } else {
        await tx.flightFare.update({ where: { id: fare.id }, data: { seatsBooked: { increment: pax } } });
      }
      return tx.booking.create({
        data: {
          bookingNumber,
          branchId,
          type: 'FLIGHT',
          status: 'CONFIRMED',
          customerId: customer.id,
          travelDate: fare.departureTime,
          paxCount: pax,
          currencyCode: fare.currencyCode,
          discount: 0,
          tax: fromCents(toCents(tax)),
          subtotal: fromCents(toCents(subtotal)),
          totalAmount: fromCents(toCents(total)),
          paymentStatus: 'UNPAID',
          notes: data.notes ?? null,
          assignedToUserId: user.id,
          createdById: user.id,
          items: {
            create: [
              {
                itemType: 'FLIGHT',
                fareId: fare.id,
                refId: fare.id,
                unitBasePrice: fare.baseFare,
                description,
                quantity: pax,
                unitPrice: fromCents(toCents(selling)),
                lineTotal: fromCents(toCents(subtotal)),
                currencyCode: fare.currencyCode,
              },
            ],
          },
        },
      });
    });
    return booking.id;
  }

  async restoreSeats(bookingId: string) {
    const items = await prisma.bookingItem.findMany({ where: { bookingId, fareId: { not: null } } });
    for (const item of items) {
      await prisma.flightFare.update({ where: { id: item.fareId! }, data: { seatsBooked: { decrement: item.quantity } } });
    }
    if (items.length > 0) {
      await prisma.flightFare.updateMany({ where: { seatsBooked: { lt: 0 } }, data: { seatsBooked: 0 } });
    }
  }

  private async assertRefs(data: any, existing?: any) {
    const airlineId = data.airlineId ?? existing?.airlineId;
    const from = data.originAirportId ?? existing?.originAirportId;
    const to = data.destinationAirportId ?? existing?.destinationAirportId;
    if (data.airlineId && !(await prisma.airline.findUnique({ where: { id: data.airlineId } }))) {
      throw new NotFoundError('Airline not found');
    }
    if (data.originAirportId && !(await prisma.airport.findUnique({ where: { id: data.originAirportId } }))) {
      throw new NotFoundError('Origin airport not found');
    }
    if (data.destinationAirportId && !(await prisma.airport.findUnique({ where: { id: data.destinationAirportId } }))) {
      throw new NotFoundError('Destination airport not found');
    }
    if (airlineId && from && to && from === to) throw new ValidationError('Origin and destination airport must differ');
  }
}

export const flightFaresService = new FlightFaresService();
