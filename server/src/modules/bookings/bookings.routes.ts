import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { moneySchema, currencyCodeSchema } from '../../lib/money';
import { resolveBranchScope } from '../../lib/branch-scope';
import {
  BOOKING_ITEM_TYPES,
  BOOKING_STATUSES,
  BOOKING_TYPES,
  bookingsService,
} from './bookings.service';

const statusParam = z.enum(BOOKING_STATUSES);

const itemBodySchema = z.object({
  itemType: z.enum(BOOKING_ITEM_TYPES).optional(),
  refId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(9999).optional(),
  unitPrice: moneySchema.optional(),
  currencyCode: currencyCodeSchema.optional(),
  notes: z.string().trim().optional().nullable(),
});

const itemUpdateSchema = itemBodySchema.partial();

const createBodySchema = z.object({
  type: z.enum(BOOKING_TYPES).optional(),
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  applicationId: z.string().uuid().optional().nullable(),
  travelDate: z.coerce.date().optional().nullable(),
  returnDate: z.coerce.date().optional().nullable(),
  paxCount: z.coerce.number().int().min(1).max(9999).optional(),
  currencyCode: currencyCodeSchema.optional(),
  discount: moneySchema.optional(),
  tax: moneySchema.optional(),
  notes: z.string().trim().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  items: z.array(itemBodySchema).optional(),
});

const updateBodySchema = createBodySchema.partial().omit({ items: true });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  type: z.enum(BOOKING_TYPES).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  customerId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);

bookingsRouter.get('/', requirePermission('bookings.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(async (req: any, res) => {
  const scope = resolveBranchScope(req.user, req.query);
  const { data, total, page, limit } = await bookingsService.list(req.user, scope, req.query);
  return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

bookingsRouter.get('/transitions', requirePermission('bookings.view'), asyncHandler(async (_req: any, res) => {
  return sendSuccess(res, {
    DRAFT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  });
}));

bookingsRouter.get('/:id', requirePermission('bookings.view'), asyncHandler(async (req: any, res) => {
  return sendSuccess(res, await bookingsService.getById(req.params.id));
}));

bookingsRouter.post('/', requirePermission('bookings.create'), validate(z.object({ body: createBodySchema })), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  const booking = await bookingsService.create(req.user, req.body);
  return sendSuccess(res, await bookingsService.getById(booking.id), 'Booking created successfully', 201);
}));

bookingsRouter.patch('/:id', requirePermission('bookings.edit'), validate(z.object({ body: updateBodySchema })), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  const booking = await bookingsService.update(req.params.id, req.body);
  return sendSuccess(res, await bookingsService.getById(booking.id), 'Booking updated successfully');
}));

bookingsRouter.patch('/:id/status', requirePermission('bookings.edit'), validate(z.object({ body: z.object({ status: statusParam }) })), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  const booking = await bookingsService.changeStatus(req.params.id, req.body.status);
  return sendSuccess(res, await bookingsService.getById(booking.id), 'Booking status updated successfully');
}));

bookingsRouter.post('/:id/items', requirePermission('bookings.edit'), validate(z.object({ body: itemBodySchema })), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  const booking = await bookingsService.addItem(req.params.id, req.body);
  return sendSuccess(res, booking, 'Item added successfully', 201);
}));

bookingsRouter.patch('/:id/items/:itemId', requirePermission('bookings.edit'), validate(z.object({ body: itemUpdateSchema })), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  const booking = await bookingsService.updateItem(req.params.id, req.params.itemId, req.body);
  return sendSuccess(res, booking, 'Item updated successfully');
}));

bookingsRouter.delete('/:id/items/:itemId', requirePermission('bookings.edit'), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  const booking = await bookingsService.deleteItem(req.params.id, req.params.itemId);
  return sendSuccess(res, booking, 'Item removed successfully');
}));

bookingsRouter.delete('/:id', requirePermission('bookings.delete'), auditLogMiddleware('Booking'), asyncHandler(async (req: any, res) => {
  await bookingsService.delete(req.params.id);
  return sendSuccess(res, null, 'Booking deleted successfully');
}));
