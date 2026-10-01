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
import { PAYMENT_METHODS, PAYMENT_STATUSES, paymentsService } from './payments.service';

const createBodySchema = z.object({
  invoiceId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  amount: moneySchema,
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(['COMPLETED', 'PENDING'] as const).optional(),
  paidAt: z.coerce.date().optional(),
  reference: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  isRefund: z.enum(['true', 'false']).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.get('/', requirePermission('payments.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(async (req: any, res: any) => {
  const scope = resolveBranchScope(req.user, req.query);
  const { data, total, page, limit } = await paymentsService.list(scope, req.query);
  return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

paymentsRouter.get('/:id', requirePermission('payments.view'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await paymentsService.getById(req.params.id));
}));

paymentsRouter.post('/', requirePermission('payments.create'), validate(z.object({ body: createBodySchema })), auditLogMiddleware('Payment'), asyncHandler(async (req: any, res: any) => {
  const payment = await paymentsService.create(req.user, req.body);
  return sendSuccess(res, payment, 'Payment recorded successfully', 201);
}));

paymentsRouter.post('/:id/confirm', requirePermission('payments.create'), auditLogMiddleware('Payment'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await paymentsService.confirm(req.params.id), 'Payment confirmed successfully');
}));

paymentsRouter.post('/:id/fail', requirePermission('payments.create'), auditLogMiddleware('Payment'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await paymentsService.fail(req.params.id), 'Payment marked failed');
}));

paymentsRouter.post('/:id/refund', requirePermission('payments.refund'), validate(z.object({ body: z.object({ amount: moneySchema.optional() }) })), auditLogMiddleware('Payment'), asyncHandler(async (req: any, res: any) => {
  const refund = await paymentsService.refund(req.params.id, req.user, req.body.amount);
  return sendSuccess(res, refund, 'Refund recorded successfully', 201);
}));

paymentsRouter.delete('/:id', requirePermission('payments.create'), auditLogMiddleware('Payment'), asyncHandler(async (req: any, res: any) => {
  await paymentsService.delete(req.params.id);
  return sendSuccess(res, null, 'Payment deleted successfully');
}));
