import { Router } from 'express';
import { z } from 'zod';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/async-handler';

export const dashboardRouter = Router();
const controller = new DashboardController();

const querySchema = z.object({
  branchId: z.string().uuid().optional(),
});

dashboardRouter.use(authenticate);
dashboardRouter.get(
  '/',
  requirePermission('reports.view'),
  validate(z.object({ query: querySchema })),
  asyncHandler(controller.getDashboardData)
);
