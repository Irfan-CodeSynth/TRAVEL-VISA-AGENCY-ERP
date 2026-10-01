import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createCustomerSchema, updateCustomerSchema, listCustomersQuerySchema } from './customers.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const customersRouter = Router();
const controller = new CustomersController();

customersRouter.use(authenticate);

customersRouter.get('/', requirePermission('customers.view'), validate(listCustomersQuerySchema), asyncHandler(controller.list));
customersRouter.get('/:id/summary', requirePermission('customers.view'), asyncHandler(controller.summary));
customersRouter.get('/:id', requirePermission('customers.view'), asyncHandler(controller.getById));
customersRouter.post('/', requirePermission('customers.create'), validate(createCustomerSchema), auditLogMiddleware('Customer'), asyncHandler(controller.create));
customersRouter.patch('/:id', requirePermission('customers.edit'), validate(updateCustomerSchema), auditLogMiddleware('Customer'), asyncHandler(controller.update));
customersRouter.delete('/:id', requirePermission('customers.delete'), auditLogMiddleware('Customer'), asyncHandler(controller.delete));
