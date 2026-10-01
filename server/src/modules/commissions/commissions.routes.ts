import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { moneySchema } from '../../lib/money';
import { resolveBranchScope } from '../../lib/branch-scope';
import { COMMISSION_STATUSES, commissionsService } from './commissions.service';

const createBodySchema = z.object({
  branchId: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  bookingId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  type: z.enum(['PERCENTAGE', 'FLAT'] as const).optional(),
  rate: z.coerce.number().min(0).max(999999).optional(),
  baseAmount: moneySchema.optional(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  notes: z.string().trim().optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  status: z.enum(COMMISSION_STATUSES).optional(),
  agentId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const commissionsRouter = Router();

commissionsRouter.use(authenticate);

commissionsRouter.get('/', requirePermission('commissions.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(async (req: any, res: any) => {
  const scope = resolveBranchScope(req.user, req.query);
  const { data, total, page, limit } = await commissionsService.list(scope, req.query);
  return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

commissionsRouter.get('/:id', requirePermission('commissions.view'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await commissionsService.getById(req.params.id));
}));

commissionsRouter.post('/', requirePermission('commissions.create'), validate(z.object({ body: createBodySchema })), auditLogMiddleware('Commission'), asyncHandler(async (req: any, res: any) => {
  const commission = await commissionsService.create(req.user, req.body);
  return sendSuccess(res, commission, 'Commission created successfully', 201);
}));

commissionsRouter.post('/generate', requirePermission('commissions.create'), validate(z.object({ body: z.object({ bookingId: z.string().uuid(), agentId: z.string().uuid() }) })), auditLogMiddleware('Commission'), asyncHandler(async (req: any, res: any) => {
  const commission = await commissionsService.generateFromBooking(req.user, req.body.bookingId, req.body.agentId);
  return sendSuccess(res, commission, 'Commission generated from booking successfully', 201);
}));

commissionsRouter.patch('/:id/status', requirePermission('commissions.edit'), validate(z.object({ body: z.object({ status: z.enum(COMMISSION_STATUSES) }) })), auditLogMiddleware('Commission'), asyncHandler(async (req: any, res: any) => {
  const commission = await commissionsService.changeStatus(req.params.id, req.body.status, req.user.id);
  return sendSuccess(res, commission, 'Commission status updated successfully');
}));

commissionsRouter.delete('/:id', requirePermission('commissions.edit'), auditLogMiddleware('Commission'), asyncHandler(async (req: any, res: any) => {
  await commissionsService.delete(req.params.id);
  return sendSuccess(res, null, 'Commission deleted successfully');
}));
