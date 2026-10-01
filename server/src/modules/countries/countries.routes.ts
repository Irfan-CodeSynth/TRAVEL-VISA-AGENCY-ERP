import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { NotFoundError, ConflictError } from '../../lib/errors';

const createSchema = z.object({
  body: z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    name: z.string().min(2),
    region: z.string().optional(),
    flagEmoji: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
    name: z.string().min(2).optional(),
    region: z.string().optional().nullable(),
    flagEmoji: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

class CountriesController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = {};
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { code: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.country.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
      prisma.country.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const country = await prisma.country.findUnique({ where: { id: req.params.id } });
    if (!country) throw new NotFoundError('Country not found');
    return sendSuccess(res, country);
  };

  create = async (req: any, res: any) => {
    const country = await prisma.country.create({ data: req.body });
    return sendSuccess(res, country, 'Country created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const country = await prisma.country.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, country, 'Country updated successfully');
  };

  delete = async (req: any, res: any) => {
    const country = await prisma.country.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { customers: true, leads: true, visaTypes: true } } },
    });
    if (!country) throw new NotFoundError('Country not found');
    if (country._count.customers > 0 || country._count.leads > 0 || country._count.visaTypes > 0) {
      throw new ConflictError('Country is referenced by customers, leads or visa types');
    }
    await prisma.country.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Country deleted successfully');
  };
}

export const countriesRouter = Router();
const controller = new CountriesController();

countriesRouter.use(authenticate);
countriesRouter.get('/', requirePermission('visa.view'), asyncHandler(controller.list));
countriesRouter.get('/:id', requirePermission('visa.view'), asyncHandler(controller.getById));
countriesRouter.post('/', requirePermission('visa.manage'), validate(createSchema), auditLogMiddleware('Country'), asyncHandler(controller.create));
countriesRouter.patch('/:id', requirePermission('visa.manage'), validate(updateSchema), auditLogMiddleware('Country'), asyncHandler(controller.update));
countriesRouter.delete('/:id', requirePermission('visa.manage'), auditLogMiddleware('Country'), asyncHandler(controller.delete));
