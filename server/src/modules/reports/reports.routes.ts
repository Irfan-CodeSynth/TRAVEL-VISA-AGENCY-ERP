import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/async-handler';
import { sendSuccess } from '../../lib/api-response';
import { reportsService, REPORT_TYPES } from './reports.service';

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().uuid().optional(),
});

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get(
  '/:type',
  requirePermission('reports.view'),
  validate(z.object({ params: z.object({ type: z.enum(REPORT_TYPES) }), query: querySchema })),
  asyncHandler(async (req: any, res: any) => {
    const report = await reportsService.get(req.user, req.params.type, req.query);
    return sendSuccess(res, { type: req.params.type, ...report });
  })
);
