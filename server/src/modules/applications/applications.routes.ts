import { Router } from 'express';
import { ApplicationsController } from './applications.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createApplicationSchema, updateApplicationSchema, changeStatusSchema, listApplicationsQuerySchema } from './applications.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const applicationsRouter = Router();
const controller = new ApplicationsController();

applicationsRouter.use(authenticate);

applicationsRouter.get('/stats', requirePermission('applications.view'), asyncHandler(controller.stats));
applicationsRouter.get('/', requirePermission('applications.view'), validate(listApplicationsQuerySchema), asyncHandler(controller.list));
applicationsRouter.get('/:id', requirePermission('applications.view'), asyncHandler(controller.getById));
applicationsRouter.get('/:id/timeline', requirePermission('applications.view'), asyncHandler(controller.timeline));
applicationsRouter.get('/:id/transitions', requirePermission('applications.view'), asyncHandler(controller.transitions));
applicationsRouter.post('/', requirePermission('applications.create'), validate(createApplicationSchema), auditLogMiddleware('Application'), asyncHandler(controller.create));
applicationsRouter.patch('/:id', requirePermission('applications.edit'), validate(updateApplicationSchema), auditLogMiddleware('Application'), asyncHandler(controller.update));
applicationsRouter.patch('/:id/status', requirePermission('applications.edit'), validate(changeStatusSchema), auditLogMiddleware('Application'), asyncHandler(controller.changeStatus));
applicationsRouter.delete('/:id', requirePermission('applications.delete'), auditLogMiddleware('Application'), asyncHandler(controller.delete));
