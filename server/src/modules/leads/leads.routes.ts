import { Router } from 'express';
import { LeadsController } from './leads.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createLeadSchema, updateLeadSchema, listLeadsQuerySchema } from './leads.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const leadsRouter = Router();
const controller = new LeadsController();

leadsRouter.use(authenticate);

leadsRouter.get('/', requirePermission('leads.view'), validate(listLeadsQuerySchema), asyncHandler(controller.list));
leadsRouter.get('/:id', requirePermission('leads.view'), asyncHandler(controller.getById));
leadsRouter.post('/', requirePermission('leads.create'), validate(createLeadSchema), auditLogMiddleware('Lead'), asyncHandler(controller.create));
leadsRouter.patch('/:id', requirePermission('leads.edit'), validate(updateLeadSchema), auditLogMiddleware('Lead'), asyncHandler(controller.update));
leadsRouter.delete('/:id', requirePermission('leads.delete'), auditLogMiddleware('Lead'), asyncHandler(controller.delete));
leadsRouter.post('/:id/convert', requirePermission('leads.convert'), auditLogMiddleware('Lead'), asyncHandler(controller.convert));
leadsRouter.post('/:id/lose', requirePermission('leads.edit'), auditLogMiddleware('Lead'), asyncHandler(controller.lose));
