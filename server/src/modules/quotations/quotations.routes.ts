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
import { BOOKING_ITEM_TYPES } from '../bookings/bookings.service';
import { QUOTATION_STATUSES, quotationsService } from './quotations.service';

const itemBodySchema = z.object({
  itemType: z.enum(BOOKING_ITEM_TYPES).optional(),
  refId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(9999).optional(),
  unitPrice: moneySchema.optional(),
});

const itemUpdateSchema = itemBodySchema.partial();

const createBodySchema = z.object({
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  bookingId: z.string().uuid().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
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
  status: z.enum(QUOTATION_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const quotationsRouter = Router();

quotationsRouter.use(authenticate);

quotationsRouter.get('/', requirePermission('quotations.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(async (req: any, res: any) => {
  const scope = resolveBranchScope(req.user, req.query);
  const { data, total, page, limit } = await quotationsService.list(scope, req.query);
  return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

quotationsRouter.get('/:id', requirePermission('quotations.view'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await quotationsService.getById(req.params.id));
}));

quotationsRouter.post('/', requirePermission('quotations.create'), validate(z.object({ body: createBodySchema })), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const quotation = await quotationsService.create(req.user, req.body);
  return sendSuccess(res, await quotationsService.getById(quotation.id), 'Quotation created successfully', 201);
}));

quotationsRouter.patch('/:id', requirePermission('quotations.edit'), validate(z.object({ body: updateBodySchema })), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const quotation = await quotationsService.update(req.params.id, req.body);
  return sendSuccess(res, await quotationsService.getById(quotation.id), 'Quotation updated successfully');
}));

quotationsRouter.patch('/:id/status', requirePermission('quotations.send'), validate(z.object({ body: z.object({ status: z.enum(QUOTATION_STATUSES) }) })), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const quotation = await quotationsService.changeStatus(req.params.id, req.body.status);
  return sendSuccess(res, await quotationsService.getById(quotation.id), 'Quotation status updated successfully');
}));

quotationsRouter.post('/:id/convert', requirePermission('quotations.create'), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const invoice = await quotationsService.convert(req.params.id, req.user);
  return sendSuccess(res, invoice, 'Quotation converted to invoice successfully', 201);
}));

quotationsRouter.post('/:id/items', requirePermission('quotations.edit'), validate(z.object({ body: itemBodySchema })), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const quotation = await quotationsService.addItem(req.params.id, req.body);
  return sendSuccess(res, quotation, 'Item added successfully', 201);
}));

quotationsRouter.patch('/:id/items/:itemId', requirePermission('quotations.edit'), validate(z.object({ body: itemUpdateSchema })), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const quotation = await quotationsService.updateItem(req.params.id, req.params.itemId, req.body);
  return sendSuccess(res, quotation, 'Item updated successfully');
}));

quotationsRouter.delete('/:id/items/:itemId', requirePermission('quotations.edit'), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  const quotation = await quotationsService.deleteItem(req.params.id, req.params.itemId);
  return sendSuccess(res, quotation, 'Item removed successfully');
}));

quotationsRouter.delete('/:id', requirePermission('quotations.edit'), auditLogMiddleware('Quotation'), asyncHandler(async (req: any, res: any) => {
  await quotationsService.delete(req.params.id);
  return sendSuccess(res, null, 'Quotation deleted successfully');
}));
