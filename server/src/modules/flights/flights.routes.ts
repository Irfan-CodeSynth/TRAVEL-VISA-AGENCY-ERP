import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { NotFoundError } from '../../lib/errors';
import { moneySchema } from '../../lib/money';

const bodySchema = z.object({
  airline: z.string().trim().min(1),
  flightNumber: z.string().trim().min(1),
  originCity: z.string().trim().optional().nullable(),
  originAirport: z.string().trim().optional().nullable(),
  destinationCity: z.string().trim().optional().nullable(),
  destinationAirport: z.string().trim().optional().nullable(),
  departureTime: z.coerce.date().optional().nullable(),
  arrivalTime: z.coerce.date().optional().nullable(),
  classType: z.string().trim().optional().nullable(),
  baseFare: moneySchema.optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  seatsAvailable: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

class FlightsController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null };
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.airline) where.airline = { equals: req.query.airline, mode: 'insensitive' };
    if (req.query.search) {
      where.OR = [
        { airline: { contains: req.query.search, mode: 'insensitive' } },
        { flightNumber: { contains: req.query.search, mode: 'insensitive' } },
        { originCity: { contains: req.query.search, mode: 'insensitive' } },
        { destinationCity: { contains: req.query.search, mode: 'insensitive' } },
        { originAirport: { contains: req.query.search, mode: 'insensitive' } },
        { destinationAirport: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.flight.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.flight.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const flight = await prisma.flight.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!flight) throw new NotFoundError('Flight not found');
    return sendSuccess(res, flight);
  };

  create = async (req: any, res: any) => {
    const flight = await prisma.flight.create({ data: req.body });
    return sendSuccess(res, flight, 'Flight created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const flight = await prisma.flight.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!flight) throw new NotFoundError('Flight not found');
    const updated = await prisma.flight.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, updated, 'Flight updated successfully');
  };

  delete = async (req: any, res: any) => {
    const flight = await prisma.flight.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!flight) throw new NotFoundError('Flight not found');
    await prisma.flight.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Flight deleted successfully');
  };
}

export const flightsRouter = Router();
const controller = new FlightsController();

flightsRouter.use(authenticate);
flightsRouter.get('/', requirePermission('flights.view'), asyncHandler(controller.list));
flightsRouter.get('/:id', requirePermission('flights.view'), asyncHandler(controller.getById));
flightsRouter.post('/', requirePermission('flights.create'), validate(z.object({ body: bodySchema })), auditLogMiddleware('Flight'), asyncHandler(controller.create));
flightsRouter.patch('/:id', requirePermission('flights.edit'), validate(z.object({ body: bodySchema.partial() })), auditLogMiddleware('Flight'), asyncHandler(controller.update));
flightsRouter.delete('/:id', requirePermission('flights.delete'), auditLogMiddleware('Flight'), asyncHandler(controller.delete));
