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
  company: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  contactPerson: z.string().trim().optional().nullable(),
  commissionType: z.enum(['PERCENTAGE', 'FLAT']).optional(),
  commissionRate: moneySchema.optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({ body: bodySchema });
const updateSchema = z.object({ body: bodySchema.partial() });

class AgentsController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null };
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.commissionType) where.commissionType = req.query.commissionType;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { company: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { phone: { contains: req.query.search, mode: 'insensitive' } },
        { city: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { commissions: true } } },
      }),
      prisma.agent.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { _count: { select: { commissions: true } } },
    });
    if (!agent) throw new NotFoundError('Agent not found');
    return sendSuccess(res, agent);
  };

  create = async (req: any, res: any) => {
    const agent = await prisma.agent.create({ data: req.body });
    return sendSuccess(res, agent, 'Agent created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const agent = await prisma.agent.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!agent) throw new NotFoundError('Agent not found');
    const updated = await prisma.agent.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, updated, 'Agent updated successfully');
  };

  delete = async (req: any, res: any) => {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { _count: { select: { commissions: true } } },
    });
    if (!agent) throw new NotFoundError('Agent not found');
    if (agent._count.commissions > 0) {
      throw new ConflictError('Agent has commissions and cannot be deleted');
    }
    await prisma.agent.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Agent deleted successfully');
  };
}

export const agentsRouter = Router();
const controller = new AgentsController();

agentsRouter.use(authenticate);
agentsRouter.get('/', requirePermission('agents.view'), asyncHandler(controller.list));
agentsRouter.get('/:id', requirePermission('agents.view'), asyncHandler(controller.getById));
agentsRouter.post('/', requirePermission('agents.create'), validate(createSchema), auditLogMiddleware('Agent'), asyncHandler(controller.create));
agentsRouter.patch('/:id', requirePermission('agents.edit'), validate(updateSchema), auditLogMiddleware('Agent'), asyncHandler(controller.update));
agentsRouter.delete('/:id', requirePermission('agents.delete'), auditLogMiddleware('Agent'), asyncHandler(controller.delete));
