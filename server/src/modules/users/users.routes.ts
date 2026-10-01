import { Router } from 'express';
import { UsersController } from './users.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from './users.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const usersRouter = Router();
const controller = new UsersController();

usersRouter.use(authenticate);

usersRouter.get('/', requirePermission('users.view'), validate(listUsersQuerySchema), asyncHandler(controller.list));
usersRouter.get('/:id', requirePermission('users.view'), asyncHandler(controller.getById));
usersRouter.post('/', requirePermission('users.manage'), validate(createUserSchema), auditLogMiddleware('User'), asyncHandler(controller.create));
usersRouter.patch('/:id', requirePermission('users.manage'), validate(updateUserSchema), auditLogMiddleware('User'), asyncHandler(controller.update));
usersRouter.delete('/:id', requirePermission('users.manage'), auditLogMiddleware('User'), asyncHandler(controller.delete));
