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
import { optionalMoneySchema } from '../../lib/money';

export const airlinesRouter = Router();

airlinesRouter.use(authenticate);

const bodySchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(6),
  name: z.string().trim().min(2),
  country: z.string().trim().optional().nullable(),
  defaultMarginType: z.enum(['PERCENT', 'FLAT']).optional().nullable(),
  defaultMarginValue: optionalMoneySchema,
  isActive: z.boolean().optional(),
});

airlinesRouter.get(
  '/',
  requirePermission('flights.view'),
  validate(z.object({ query: z.object({ search: z.string().trim().optional(), page: z.string().optional(), limit: z.string().optional(), active: z.enum(['true', 'false']).optional() }) })),
  asyncHandler(async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = {};
    if (req.query.active === 'true') where.isActive = true;
    if (req.query.search) {
      const s = req.query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { country: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.airline.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ name: 'asc' }] }),
      prisma.airline.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

airlinesRouter.get('/:id', requirePermission('flights.view'), asyncHandler(async (req: any, res: any) => {
  const airline = await prisma.airline.findUnique({ where: { id: req.params.id } });
  if (!airline) throw new NotFoundError('Airline not found');
  return sendSuccess(res, airline);
}));

airlinesRouter.post(
  '/',
  requirePermission('flights.create'),
  validate(z.object({ body: bodySchema })),
  auditLogMiddleware('Airline'),
  asyncHandler(async (req: any, res: any) => {
    const exists = await prisma.airline.findUnique({ where: { code: req.body.code } });
    if (exists) throw new ConflictError(`Airline code ${req.body.code} already exists`);
    const airline = await prisma.airline.create({ data: req.body });
    return sendSuccess(res, airline, 'Airline created successfully', 201);
  })
);

airlinesRouter.patch(
  '/:id',
  requirePermission('flights.edit'),
  validate(z.object({ body: bodySchema.partial() })),
  auditLogMiddleware('Airline'),
  asyncHandler(async (req: any, res: any) => {
    const airline = await prisma.airline.findUnique({ where: { id: req.params.id } });
    if (!airline) throw new NotFoundError('Airline not found');
    if (req.body.code && req.body.code !== airline.code) {
      const dup = await prisma.airline.findUnique({ where: { code: req.body.code } });
      if (dup) throw new ConflictError(`Airline code ${req.body.code} already exists`);
    }
    const updated = await prisma.airline.update({ where: { id: airline.id }, data: req.body });
    return sendSuccess(res, updated, 'Airline updated successfully');
  })
);

airlinesRouter.delete('/:id', requirePermission('flights.delete'), auditLogMiddleware('Airline'), asyncHandler(async (req: any, res: any) => {
  const fares = await prisma.flightFare.count({ where: { airlineId: req.params.id, deletedAt: null } });
  if (fares > 0) throw new ConflictError('Airline has fares linked to it and cannot be deleted');
  await prisma.airline.delete({ where: { id: req.params.id } });
  return sendSuccess(res, null, 'Airline deleted successfully');
}));
