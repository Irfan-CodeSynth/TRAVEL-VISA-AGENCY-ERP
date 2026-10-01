import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { ConflictError, NotFoundError } from '../../lib/errors';

export const airportsRouter = Router();

airportsRouter.use(authenticate);

const bodySchema = z.object({
  iataCode: z.string().trim().toUpperCase().length(3),
  name: z.string().trim().min(2),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

airportsRouter.get(
  '/',
  requirePermission('flights.view'),
  validate(z.object({ query: z.object({ search: z.string().trim().optional(), country: z.string().trim().optional(), page: z.string().optional(), limit: z.string().optional(), active: z.enum(['true', 'false']).optional() }) })),
  asyncHandler(async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = {};
    if (req.query.active === 'true') where.isActive = true;
    if (req.query.country) where.country = { equals: req.query.country, mode: 'insensitive' };
    if (req.query.search) {
      const s = req.query.search.trim();
      where.OR = [
        { iataCode: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { country: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.airport.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ iataCode: 'asc' }] }),
      prisma.airport.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

airportsRouter.get('/:id', requirePermission('flights.view'), asyncHandler(async (req: any, res: any) => {
  const airport = await prisma.airport.findUnique({ where: { id: req.params.id } });
  if (!airport) throw new NotFoundError('Airport not found');
  return sendSuccess(res, airport);
}));

airportsRouter.post(
  '/',
  requirePermission('flights.create'),
  validate(z.object({ body: bodySchema })),
  auditLogMiddleware('Airport'),
  asyncHandler(async (req: any, res: any) => {
    const exists = await prisma.airport.findUnique({ where: { iataCode: req.body.iataCode } });
    if (exists) throw new ConflictError(`Airport ${req.body.iataCode} already exists`);
    const airport = await prisma.airport.create({ data: req.body });
    return sendSuccess(res, airport, 'Airport created successfully', 201);
  })
);

airportsRouter.patch(
  '/:id',
  requirePermission('flights.edit'),
  validate(z.object({ body: bodySchema.partial() })),
  auditLogMiddleware('Airport'),
  asyncHandler(async (req: any, res: any) => {
    const airport = await prisma.airport.findUnique({ where: { id: req.params.id } });
    if (!airport) throw new NotFoundError('Airport not found');
    if (req.body.iataCode && req.body.iataCode !== airport.iataCode) {
      const dup = await prisma.airport.findUnique({ where: { iataCode: req.body.iataCode } });
      if (dup) throw new ConflictError(`Airport ${req.body.iataCode} already exists`);
    }
    const updated = await prisma.airport.update({ where: { id: airport.id }, data: req.body });
    return sendSuccess(res, updated, 'Airport updated successfully');
  })
);

airportsRouter.delete('/:id', requirePermission('flights.delete'), auditLogMiddleware('Airport'), asyncHandler(async (req: any, res: any) => {
  const fares = await prisma.flightFare.count({ where: { deletedAt: null, OR: [{ originAirportId: req.params.id }, { destinationAirportId: req.params.id }] } });
  if (fares > 0) throw new ConflictError('Airport has fares linked to it and cannot be deleted');
  await prisma.airport.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'Airport deleted successfully');
}));
