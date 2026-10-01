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
  name: z.string().trim().min(2),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  starRating: z.coerce.number().int().min(1).max(7).optional().nullable(),
  roomType: z.string().trim().optional().nullable(),
  ratePerNight: moneySchema.optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  roomsAvailable: z.coerce.number().int().min(0).optional().nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

class HotelsController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null };
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.city) where.city = { contains: req.query.city, mode: 'insensitive' };
    if (req.query.starRating) where.starRating = parseInt(req.query.starRating);
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { city: { contains: req.query.search, mode: 'insensitive' } },
        { country: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.hotel.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
      prisma.hotel.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const hotel = await prisma.hotel.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!hotel) throw new NotFoundError('Hotel not found');
    return sendSuccess(res, hotel);
  };

  create = async (req: any, res: any) => {
    const hotel = await prisma.hotel.create({ data: req.body });
    return sendSuccess(res, hotel, 'Hotel created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const hotel = await prisma.hotel.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!hotel) throw new NotFoundError('Hotel not found');
    const updated = await prisma.hotel.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, updated, 'Hotel updated successfully');
  };

  delete = async (req: any, res: any) => {
    const hotel = await prisma.hotel.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!hotel) throw new NotFoundError('Hotel not found');
    await prisma.hotel.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Hotel deleted successfully');
  };
}

export const hotelsRouter = Router();
const controller = new HotelsController();

hotelsRouter.use(authenticate);
hotelsRouter.get('/', requirePermission('hotels.view'), asyncHandler(controller.list));
hotelsRouter.get('/:id', requirePermission('hotels.view'), asyncHandler(controller.getById));
hotelsRouter.post('/', requirePermission('hotels.create'), validate(z.object({ body: bodySchema })), auditLogMiddleware('Hotel'), asyncHandler(controller.create));
hotelsRouter.patch('/:id', requirePermission('hotels.edit'), validate(z.object({ body: bodySchema.partial() })), auditLogMiddleware('Hotel'), asyncHandler(controller.update));
hotelsRouter.delete('/:id', requirePermission('hotels.delete'), auditLogMiddleware('Hotel'), asyncHandler(controller.delete));
