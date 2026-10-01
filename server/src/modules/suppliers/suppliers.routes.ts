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

const SUPPLIER_TYPES = ['AIRLINE', 'HOTEL', 'EMBASSY', 'TRANSPORT', 'INSURANCE', 'VISA_AGENT', 'OTHER'] as const;

const bodySchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(SUPPLIER_TYPES).optional(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  website: z.string().trim().url().optional().nullable().or(z.literal('')),
  contactPerson: z.string().trim().optional().nullable(),
  taxNumber: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({ body: bodySchema });
const updateSchema = z.object({ body: bodySchema.partial() });

class SuppliersController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null };
    if (req.query.type) where.type = req.query.type;
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { phone: { contains: req.query.search, mode: 'insensitive' } },
        { contactPerson: { contains: req.query.search, mode: 'insensitive' } },
        { city: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' } }),
      prisma.supplier.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!supplier) throw new NotFoundError('Supplier not found');
    return sendSuccess(res, supplier);
  };

  create = async (req: any, res: any) => {
    const supplier = await prisma.supplier.create({ data: req.body });
    return sendSuccess(res, supplier, 'Supplier created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!supplier) throw new NotFoundError('Supplier not found');
    const updated = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, updated, 'Supplier updated successfully');
  };

  delete = async (req: any, res: any) => {
    const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!supplier) throw new NotFoundError('Supplier not found');
    await prisma.supplier.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Supplier deleted successfully');
  };
}

export const suppliersRouter = Router();
const controller = new SuppliersController();

suppliersRouter.use(authenticate);
suppliersRouter.get('/', requirePermission('suppliers.view'), asyncHandler(controller.list));
suppliersRouter.get('/:id', requirePermission('suppliers.view'), asyncHandler(controller.getById));
suppliersRouter.post('/', requirePermission('suppliers.create'), validate(createSchema), auditLogMiddleware('Supplier'), asyncHandler(controller.create));
suppliersRouter.patch('/:id', requirePermission('suppliers.edit'), validate(updateSchema), auditLogMiddleware('Supplier'), asyncHandler(controller.update));
suppliersRouter.delete('/:id', requirePermission('suppliers.delete'), auditLogMiddleware('Supplier'), asyncHandler(controller.delete));
