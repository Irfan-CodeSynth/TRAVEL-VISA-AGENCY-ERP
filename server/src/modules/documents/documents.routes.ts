import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { ValidationError } from '../../lib/errors';
import { resolveBranchScope } from '../../lib/branch-scope';
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, documentsService } from './documents.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const uploadBodySchema = z.object({
  title: z.string().trim().min(2),
  type: z.enum(DOCUMENT_TYPES).optional(),
  customerId: z.string().uuid().optional().nullable(),
  applicationId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

const updateBodySchema = uploadBodySchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  type: z.enum(DOCUMENT_TYPES).optional(),
  customerId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  expiringSoon: z.enum(['true', 'false']).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.get('/', requirePermission('documents.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(async (req: any, res: any) => {
  const scope = resolveBranchScope(req.user, req.query);
  const { data, total, page, limit } = await documentsService.list(scope, req.query);
  return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

documentsRouter.post('/', requirePermission('documents.upload'), upload.single('file'), asyncHandler(async (req: any, res: any) => {
  const parsed = uploadBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const document = await documentsService.upload(req.user, parsed.data, req.file);
  return sendSuccess(res, await documentsService.getById(document.id), 'Document uploaded successfully', 201);
}));

documentsRouter.get('/:id', requirePermission('documents.view'), asyncHandler(async (req: any, res: any) => {
  return sendSuccess(res, await documentsService.getById(req.params.id));
}));

documentsRouter.get('/:id/download', requirePermission('documents.view'), asyncHandler(async (req: any, res: any) => {
  const document = await documentsService.getById(req.params.id);
  const buffer = await documentsService.getFile(document);
  res.setHeader('Content-Type', document.mimeType ?? 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${document.fileName.replace(/"/g, '')}"`
  );
  return res.send(buffer);
}));

documentsRouter.patch('/:id', requirePermission('documents.upload'), validate(z.object({ body: updateBodySchema })), auditLogMiddleware('Document'), asyncHandler(async (req: any, res: any) => {
  await documentsService.update(req.params.id, req.body);
  return sendSuccess(res, await documentsService.getById(req.params.id), 'Document updated successfully');
}));

documentsRouter.patch('/:id/status', requirePermission('documents.verify'), validate(z.object({ body: z.object({
  status: z.enum(DOCUMENT_STATUSES),
  rejectReason: z.string().trim().optional().nullable(),
}) })), auditLogMiddleware('Document'), asyncHandler(async (req: any, res: any) => {
  const document = await documentsService.changeStatus(req.params.id, req.body.status, req.user.id, req.body.rejectReason ?? undefined);
  return sendSuccess(res, document, 'Document status updated successfully');
}));

documentsRouter.delete('/:id', requirePermission('documents.delete'), auditLogMiddleware('Document'), asyncHandler(async (req: any, res: any) => {
  await documentsService.delete(req.params.id);
  return sendSuccess(res, null, 'Document deleted successfully');
}));
