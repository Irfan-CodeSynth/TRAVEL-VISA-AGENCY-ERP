import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { moneySchema, optionalMoneySchema } from '../../lib/money';
import { canSeeMargin, flightFaresService } from './flight-fares.service';

export const flightFaresRouter = Router();

flightFaresRouter.use(authenticate);

const bodySchema = z.object({
  airlineId: z.string().uuid(),
  flightNumber: z.string().trim().min(1),
  originAirportId: z.string().uuid(),
  destinationAirportId: z.string().uuid(),
  departureTime: z.coerce.date(),
  arrivalTime: z.coerce.date().optional().nullable(),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  baseFare: moneySchema,
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  marginType: z.enum(['PERCENT', 'FLAT']).optional().nullable(),
  marginValue: optionalMoneySchema,
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  seatsTotal: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

flightFaresRouter.get(
  '/search',
  requirePermission('flights.view'),
  validate(z.object({ query: z.object({
    fromCode: z.string().trim().toUpperCase().length(3).optional(),
    toCode: z.string().trim().toUpperCase().length(3).optional(),
    date: z.string().trim().optional(),
    cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
    pax: z.coerce.number().int().min(1).max(9).optional(),
  }) })),
  asyncHandler(async (req: any, res: any) => {
    const data = await flightFaresService.search(req.query, canSeeMargin(req.user));
    return sendSuccess(res, data);
  })
);

flightFaresRouter.get(
  '/',
  requirePermission('flights.view'),
  asyncHandler(async (req: any, res: any) => {
    const { data, total, page, limit } = await flightFaresService.list(req.query, canSeeMargin(req.user));
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

flightFaresRouter.get('/:id', requirePermission('flights.view'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await flightFaresService.getById(req.params.id, canSeeMargin(req.user)));
}));

flightFaresRouter.post(
  '/',
  requirePermission('flights.create'),
  validate(z.object({ body: bodySchema })),
  auditLogMiddleware('FlightFare'),
  asyncHandler(async (req: any, res: any) => {
    return sendSuccess(res, await flightFaresService.create(req.body), 'Fare created successfully', 201);
  })
);

flightFaresRouter.patch(
  '/:id',
  requirePermission('flights.edit'),
  validate(z.object({ body: bodySchema.partial().extend({ airlineId: z.string().uuid().optional(), flightNumber: z.string().trim().min(1).optional(), originAirportId: z.string().uuid().optional(), destinationAirportId: z.string().uuid().optional(), departureTime: z.coerce.date().optional(), baseFare: moneySchema.optional() }) })),
  auditLogMiddleware('FlightFare'),
  asyncHandler(async (req: any, res: any) => {
    return sendSuccess(res, await flightFaresService.update(req.params.id, req.body), 'Fare updated successfully');
  })
);

flightFaresRouter.delete('/:id', requirePermission('flights.delete'), auditLogMiddleware('FlightFare'), asyncHandler(async (req: any, res: any) => {
  await flightFaresService.delete(req.params.id);
  return sendSuccess(res, null, 'Fare deleted successfully');
}));

flightFaresRouter.post(
  '/:id/sell',
  requirePermission('bookings.create'),
  validate(z.object({ body: z.object({
    customerId: z.string().uuid(),
    pax: z.coerce.number().int().min(1).max(9).optional(),
    branchId: z.string().uuid().optional(),
    notes: z.string().optional().nullable(),
  }) })),
  auditLogMiddleware('Booking'),
  asyncHandler(async (req: any, res: any) => {
    const bookingId = await flightFaresService.sell(req.user, req.params.id, req.body);
    const { bookingsService } = await import('../bookings/bookings.service');
    return sendSuccess(res, await bookingsService.getById(bookingId), 'Tickets sold successfully', 201);
  })
);
