import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { NotFoundError, ConflictError, ValidationError } from '../../lib/errors';
import { moneySchema } from '../../lib/money';

const bodySchema = z.object({
  countryId: z.string().uuid(),
  code: z.string().trim().toUpperCase().min(1).max(20),
  name: z.string().trim().min(2),
  category: z.string().trim().optional().nullable(),
  allowedStayDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
  processingDays: z.coerce.number().int().min(0).max(730).optional().nullable(),
  price: moneySchema.optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  requirements: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({ body: bodySchema });
const updateSchema = z.object({ body: bodySchema.partial() });

class VisaTypesController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null };
    if (req.query.countryId) where.countryId = req.query.countryId;
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { code: { contains: req.query.search, mode: 'insensitive' } },
        { category: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.visaType.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { country: { select: { id: true, code: true, name: true, flagEmoji: true } } },
      }),
      prisma.visaType.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const visaType = await prisma.visaType.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { country: true },
    });
    if (!visaType) throw new NotFoundError('Visa type not found');
    return sendSuccess(res, visaType);
  };

  create = async (req: any, res: any) => {
    const country = await prisma.country.findUnique({ where: { id: req.body.countryId } });
    if (!country) throw new ValidationError('Country not found');
    const existing = await prisma.visaType.findFirst({
      where: { countryId: req.body.countryId, code: req.body.code, deletedAt: null },
    });
    if (existing) throw new ConflictError('A visa type with this code already exists for the country');
    const visaType = await prisma.visaType.create({
      data: req.body,
      include: { country: { select: { id: true, code: true, name: true, flagEmoji: true } } },
    });
    return sendSuccess(res, visaType, 'Visa type created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const visaType = await prisma.visaType.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!visaType) throw new NotFoundError('Visa type not found');
    if (req.body.code || req.body.countryId) {
      const conflict = await prisma.visaType.findFirst({
        where: {
          id: { not: visaType.id },
          deletedAt: null,
          countryId: req.body.countryId ?? visaType.countryId,
          code: req.body.code ?? visaType.code,
        },
      });
      if (conflict) throw new ConflictError('A visa type with this code already exists for the country');
    }
    const updated = await prisma.visaType.update({
      where: { id: req.params.id },
      data: req.body,
      include: { country: { select: { id: true, code: true, name: true, flagEmoji: true } } },
    });
    return sendSuccess(res, updated, 'Visa type updated successfully');
  };

  delete = async (req: any, res: any) => {
    const visaType = await prisma.visaType.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { _count: { select: { applications: true } } },
    });
    if (!visaType) throw new NotFoundError('Visa type not found');
    if (visaType._count.applications > 0) {
      throw new ConflictError('Visa type is referenced by applications');
    }
    await prisma.visaType.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Visa type deleted successfully');
  };
}

export const visaTypesRouter = Router();
const controller = new VisaTypesController();

visaTypesRouter.use(authenticate);
visaTypesRouter.get('/', requirePermission('visa.view'), asyncHandler(controller.list));
visaTypesRouter.get('/:id', requirePermission('visa.view'), asyncHandler(controller.getById));
visaTypesRouter.post('/', requirePermission('visa.manage'), validate(createSchema), auditLogMiddleware('VisaType'), asyncHandler(controller.create));
visaTypesRouter.patch('/:id', requirePermission('visa.manage'), validate(updateSchema), auditLogMiddleware('VisaType'), asyncHandler(controller.update));
visaTypesRouter.delete('/:id', requirePermission('visa.manage'), auditLogMiddleware('VisaType'), asyncHandler(controller.delete));
