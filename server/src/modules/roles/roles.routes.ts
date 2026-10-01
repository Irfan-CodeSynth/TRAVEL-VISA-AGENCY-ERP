import { Router } from 'express';
import { RolesController } from './roles.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createRoleSchema, updateRoleSchema, setPermissionsSchema } from './roles.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const rolesRouter = Router();
const controller = new RolesController();

rolesRouter.use(authenticate);

rolesRouter.get('/', requirePermission('roles.view'), asyncHandler(controller.list));
rolesRouter.get('/permissions', requirePermission('roles.view'), asyncHandler(controller.listPermissions));
rolesRouter.get('/:id', requirePermission('roles.view'), asyncHandler(controller.getById));
rolesRouter.post('/', requirePermission('roles.manage'), validate(createRoleSchema), auditLogMiddleware('Role'), asyncHandler(controller.create));
rolesRouter.patch('/:id', requirePermission('roles.manage'), validate(updateRoleSchema), auditLogMiddleware('Role'), asyncHandler(controller.update));
rolesRouter.delete('/:id', requirePermission('roles.manage'), auditLogMiddleware('Role'), asyncHandler(controller.delete));
rolesRouter.put('/:id/permissions', requirePermission('roles.manage'), validate(setPermissionsSchema), auditLogMiddleware('RolePermission'), asyncHandler(controller.setPermissions));
