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
import { INVOICE_STATUSES, invoicesService } from './invoices.service';

const itemBodySchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(9999).optional(),
  unitPrice: moneySchema.optional(),
});

const itemUpdateSchema = itemBodySchema.partial();

const createBodySchema = z.object({
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  quotationId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  issueDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  discount: moneySchema.optional(),
  tax: moneySchema.optional(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(itemBodySchema).optional(),
});

const updateBodySchema = createBodySchema.partial().omit({ items: true, branchId: true });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);

invoicesRouter.get('/', requirePermission('invoices.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(async (req: any, res: any) => {
  const scope = resolveBranchScope(req.user, req.query);
  const { data, total, page, limit } = await invoicesService.list(scope, req.query);
  return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

invoicesRouter.get('/:id', requirePermission('invoices.view'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await invoicesService.getById(req.params.id));
}));

invoicesRouter.post('/', requirePermission('invoices.create'), validate(z.object({ body: createBodySchema })), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  const invoice = await invoicesService.create(req.user, req.body);
  return sendSuccess(res, await invoicesService.getById(invoice.id), 'Invoice created successfully', 201);
}));

invoicesRouter.patch('/:id', requirePermission('invoices.edit'), validate(z.object({ body: updateBodySchema })), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  const invoice = await invoicesService.update(req.params.id, req.body);
  return sendSuccess(res, await invoicesService.getById(invoice.id), 'Invoice updated successfully');
}));

invoicesRouter.post('/:id/send', requirePermission('invoices.send'), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  await invoicesService.send(req.params.id);
  return sendSuccess(res, await invoicesService.getById(req.params.id), 'Invoice sent successfully');
}));

invoicesRouter.post('/:id/overdue', requirePermission('invoices.edit'), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  await invoicesService.markOverdue(req.params.id);
  return sendSuccess(res, await invoicesService.getById(req.params.id), 'Invoice marked overdue');
}));

invoicesRouter.post('/:id/cancel', requirePermission('invoices.edit'), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  await invoicesService.cancel(req.params.id);
  return sendSuccess(res, await invoicesService.getById(req.params.id), 'Invoice cancelled');
}));

invoicesRouter.post('/:id/items', requirePermission('invoices.edit'), validate(z.object({ body: itemBodySchema })), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  const invoice = await invoicesService.addItem(req.params.id, req.body);
  return sendSuccess(res, invoice, 'Item added successfully', 201);
}));

invoicesRouter.patch('/:id/items/:itemId', requirePermission('invoices.edit'), validate(z.object({ body: itemUpdateSchema })), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  const invoice = await invoicesService.updateItem(req.params.id, req.params.itemId, req.body);
  return sendSuccess(res, invoice, 'Item updated successfully');
}));

invoicesRouter.delete('/:id/items/:itemId', requirePermission('invoices.edit'), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  const invoice = await invoicesService.deleteItem(req.params.id, req.params.itemId);
  return sendSuccess(res, invoice, 'Item removed successfully');
}));

invoicesRouter.delete('/:id', requirePermission('invoices.edit'), auditLogMiddleware('Invoice'), asyncHandler(async (req: any, res: any) => {
  await invoicesService.delete(req.params.id);
  return sendSuccess(res, null, 'Invoice deleted successfully');
}));
