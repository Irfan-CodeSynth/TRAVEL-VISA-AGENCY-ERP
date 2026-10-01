import { Request, Response } from 'express';
import { FollowUpsService } from './followups.service';
import { sendSuccess, sendPaginated } from '../../lib/api-response';

export class FollowUpsController {
  private service = new FollowUpsService();

  list = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.list(req.query, req.user);
    return sendPaginated(res, data, pagination);
  };

  getById = async (req: Request, res: Response) => {
    return sendSuccess(res, await this.service.getById(req.params.id));
  };

  upcoming = async (req: Request, res: Response) => {
    return sendSuccess(res, await this.service.upcoming(req.query, req.user));
  };

  overdue = async (req: Request, res: Response) => {
    return sendSuccess(res, await this.service.overdue(req.query, req.user));
  };

  create = async (req: Request, res: Response) => {
    const fu = await this.service.create(req.body, req.user);
    return sendSuccess(res, fu, 'Follow-up created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    return sendSuccess(res, await this.service.update(req.params.id, req.body), 'Follow-up updated successfully');
  };

  complete = async (req: Request, res: Response) => {
    return sendSuccess(res, await this.service.complete(req.params.id), 'Follow-up completed');
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'Follow-up deleted successfully');
  };
}
