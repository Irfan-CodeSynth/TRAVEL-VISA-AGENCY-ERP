import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';

export const auditRouter = Router();
const controller = new AuditController();

auditRouter.use(authenticate);
auditRouter.get('/', requirePermission('audit.view'), asyncHandler(controller.getAuditLogs));
