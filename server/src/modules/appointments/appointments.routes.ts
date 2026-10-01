import { Router } from 'express';
import { AppointmentsController } from './appointments.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { createAppointmentSchema, updateAppointmentSchema, changeAppointmentStatusSchema, listAppointmentsQuerySchema } from './appointments.validators';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';

export const appointmentsRouter = Router();
const controller = new AppointmentsController();

appointmentsRouter.use(authenticate);

appointmentsRouter.get('/upcoming', requirePermission('appointments.view'), asyncHandler(controller.upcoming));
appointmentsRouter.get('/', requirePermission('appointments.view'), validate(listAppointmentsQuerySchema), asyncHandler(controller.list));
appointmentsRouter.get('/:id', requirePermission('appointments.view'), asyncHandler(controller.getById));
appointmentsRouter.post('/', requirePermission('appointments.create'), validate(createAppointmentSchema), auditLogMiddleware('Appointment'), asyncHandler(controller.create));
appointmentsRouter.patch('/:id', requirePermission('appointments.edit'), validate(updateAppointmentSchema), auditLogMiddleware('Appointment'), asyncHandler(controller.update));
appointmentsRouter.patch('/:id/status', requirePermission('appointments.edit'), validate(changeAppointmentStatusSchema), auditLogMiddleware('Appointment'), asyncHandler(controller.changeStatus));
appointmentsRouter.delete('/:id', requirePermission('appointments.delete'), auditLogMiddleware('Appointment'), asyncHandler(controller.delete));
