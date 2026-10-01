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
import { moneySchema } from '../../lib/money';

const bodySchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().optional().nullable(),
  type: z.string().trim().optional().nullable(),
  destination: z.string().trim().optional().nullable(),
  durationDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  price: moneySchema.optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  includes: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const PACKAGE_TYPES = ['UMRAH', 'HAJJ', 'TOUR', 'PILGRIMAGE', 'CORPORATE', 'CUSTOM'] as const;

class PackagesController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null };
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.type) where.type = req.query.type;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { code: { contains: req.query.search, mode: 'insensitive' } },
        { destination: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.package.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
      prisma.package.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const pkg = await prisma.package.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!pkg) throw new NotFoundError('Package not found');
    return sendSuccess(res, pkg);
  };

  create = async (req: any, res: any) => {
    if (req.body.code) {
      const dup = await prisma.package.findFirst({ where: { code: req.body.code, deletedAt: null } });
      if (dup) throw new ConflictError('Package code already in use');
    }
    const pkg = await prisma.package.create({ data: req.body });
    return sendSuccess(res, pkg, 'Package created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const pkg = await prisma.package.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!pkg) throw new NotFoundError('Package not found');
    if (req.body.code && req.body.code !== pkg.code) {
      const dup = await prisma.package.findFirst({ where: { code: req.body.code, deletedAt: null, id: { not: pkg.id } } });
      if (dup) throw new ConflictError('Package code already in use');
    }
    const updated = await prisma.package.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, updated, 'Package updated successfully');
  };

  delete = async (req: any, res: any) => {
    const pkg = await prisma.package.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!pkg) throw new NotFoundError('Package not found');
    await prisma.package.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Package deleted successfully');
  };
}

export const packagesRouter = Router();
const controller = new PackagesController();

packagesRouter.use(authenticate);
packagesRouter.get('/', requirePermission('packages.view'), asyncHandler(controller.list));
packagesRouter.get('/:id', requirePermission('packages.view'), asyncHandler(controller.getById));
packagesRouter.post('/', requirePermission('packages.manage'), validate(z.object({ body: bodySchema.extend({ type: z.enum(PACKAGE_TYPES).optional().nullable() }) })), auditLogMiddleware('Package'), asyncHandler(controller.create));
packagesRouter.patch('/:id', requirePermission('packages.manage'), validate(z.object({ body: bodySchema.partial().extend({ type: z.enum(PACKAGE_TYPES).optional().nullable() }) })), auditLogMiddleware('Package'), asyncHandler(controller.update));
packagesRouter.delete('/:id', requirePermission('packages.manage'), auditLogMiddleware('Package'), asyncHandler(controller.delete));
