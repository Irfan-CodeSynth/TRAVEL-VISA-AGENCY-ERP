import { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../lib/api-response';

export class DashboardController {
  getDashboardData = async (req: Request, res: Response) => {
    return sendSuccess(res, await dashboardService.getData((req as any).user, req.query as any));
  };
}
