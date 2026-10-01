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
import { resolveBranchScope } from '../../lib/branch-scope';

const CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'VISIT', 'MEETING'] as const;
const DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
const STATUSES = ['PENDING', 'SENT', 'FAILED', 'RECEIVED'] as const;

const bodySchema = z.object({
  channel: z.enum(CHANNELS).optional(),
  direction: z.enum(DIRECTIONS).optional(),
  subject: z.string().trim().min(2),
  body: z.string().trim().optional().nullable(),
  status: z.enum(STATUSES).optional(),
  occurredAt: z.coerce.date().optional(),
  customerId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  applicationId: z.string().uuid().optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  channel: z.enum(CHANNELS).optional(),
  status: z.enum(STATUSES).optional(),
  direction: z.enum(DIRECTIONS).optional(),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

const customerSelect = { select: { id: true, firstName: true, lastName: true, companyName: true } };

async function assertRefs(data: any) {
  if (data.customerId) {
    const c = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
    if (!c) throw new NotFoundError('Customer not found');
  }
  if (data.leadId) {
    const l = await prisma.lead.findFirst({ where: { id: data.leadId, deletedAt: null } });
    if (!l) throw new NotFoundError('Lead not found');
  }
  if (data.applicationId) {
    const a = await prisma.application.findFirst({ where: { id: data.applicationId, deletedAt: null } });
    if (!a) throw new NotFoundError('Application not found');
  }
}

class CommunicationsController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null, ...resolveBranchScope(req.user, req.query) };
    if (req.query.channel) where.channel = req.query.channel;
    if (req.query.status) where.status = req.query.status;
    if (req.query.direction) where.direction = req.query.direction;
    if (req.query.customerId) where.customerId = req.query.customerId;
    if (req.query.leadId) where.leadId = req.query.leadId;
    if (req.query.applicationId) where.applicationId = req.query.applicationId;
    if (req.query.search) {
      where.OR = [
        { subject: { contains: req.query.search, mode: 'insensitive' } },
        { body: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        include: {
          customer: customerSelect,
          lead: { select: { id: true, leadNumber: true, firstName: true, lastName: true } },
          application: { select: { id: true, applicationNumber: true } },
        },
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.communication.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const communication = await prisma.communication.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        customer: customerSelect,
        lead: { select: { id: true, leadNumber: true, firstName: true, lastName: true } },
        application: { select: { id: true, applicationNumber: true } },
      },
    });
    if (!communication) throw new NotFoundError('Communication not found');
    return sendSuccess(res, communication);
  };

  create = async (req: any, res: any) => {
    await assertRefs(req.body);
    if (!req.user.branchId) throw new NotFoundError('User has no branch');
    const communication = await prisma.communication.create({
      data: {
        branchId: req.user.branchId,
        channel: req.body.channel ?? 'CALL',
        direction: req.body.direction ?? 'OUTBOUND',
        subject: req.body.subject,
        body: req.body.body ?? null,
        status: req.body.status ?? 'SENT',
        occurredAt: req.body.occurredAt ?? new Date(),
        customerId: req.body.customerId ?? null,
        leadId: req.body.leadId ?? null,
        applicationId: req.body.applicationId ?? null,
        createdById: req.user.id,
      },
    });
    return sendSuccess(res, communication, 'Communication logged successfully', 201);
  };

  update = async (req: any, res: any) => {
    const existing = await prisma.communication.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Communication not found');
    await assertRefs(req.body);
    const { branchId: _ignored, ...data } = req.body;
    const communication = await prisma.communication.update({ where: { id: existing.id }, data });
    return sendSuccess(res, communication, 'Communication updated successfully');
  };

  delete = async (req: any, res: any) => {
    const existing = await prisma.communication.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Communication not found');
    await prisma.communication.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Communication deleted successfully');
  };
}

export const communicationsRouter = Router();
const controller = new CommunicationsController();

communicationsRouter.use(authenticate);
communicationsRouter.get('/', requirePermission('communications.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(controller.list));
communicationsRouter.get('/:id', requirePermission('communications.view'), asyncHandler(controller.getById));
communicationsRouter.post('/', requirePermission('communications.create'), validate(z.object({ body: bodySchema })), auditLogMiddleware('Communication'), asyncHandler(controller.create));
communicationsRouter.patch('/:id', requirePermission('communications.create'), validate(z.object({ body: bodySchema.partial() })), auditLogMiddleware('Communication'), asyncHandler(controller.update));
communicationsRouter.delete('/:id', requirePermission('communications.create'), auditLogMiddleware('Communication'), asyncHandler(controller.delete));
