import { Router } from 'express';
import { FollowUpsController } from './followups.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createFollowUpSchema, updateFollowUpSchema, listFollowUpsQuerySchema } from './followups.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const followUpsRouter = Router();
const controller = new FollowUpsController();

followUpsRouter.use(authenticate);

followUpsRouter.get('/', requirePermission('follow_ups.view'), validate(listFollowUpsQuerySchema), asyncHandler(controller.list));
followUpsRouter.get('/upcoming', requirePermission('follow_ups.view'), asyncHandler(controller.upcoming));
followUpsRouter.get('/overdue', requirePermission('follow_ups.view'), asyncHandler(controller.overdue));
followUpsRouter.get('/:id', requirePermission('follow_ups.view'), asyncHandler(controller.getById));
followUpsRouter.post('/', requirePermission('follow_ups.create'), validate(createFollowUpSchema), auditLogMiddleware('FollowUp'), asyncHandler(controller.create));
followUpsRouter.patch('/:id/complete', requirePermission('follow_ups.edit'), auditLogMiddleware('FollowUp'), asyncHandler(controller.complete));
followUpsRouter.patch('/:id', requirePermission('follow_ups.edit'), validate(updateFollowUpSchema), auditLogMiddleware('FollowUp'), asyncHandler(controller.update));
followUpsRouter.delete('/:id', requirePermission('follow_ups.edit'), auditLogMiddleware('FollowUp'), asyncHandler(controller.delete));
