import { Request, Response } from 'express';
import { ApplicationsService } from './applications.service';
import { STATUS_TRANSITIONS } from './applications.service';
import { sendSuccess, sendPaginated } from '../../lib/api-response';

export class ApplicationsController {
  private service = new ApplicationsService();

  list = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.list(req.query, req.user);
    return sendPaginated(res, data, pagination);
  };

  getById = async (req: Request, res: Response) => {
    const application = await this.service.getById(req.params.id);
    return sendSuccess(res, application);
  };

  create = async (req: Request, res: Response) => {
    const application = await this.service.create(req.body, req.user);
    return sendSuccess(res, application, 'Application created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    const application = await this.service.update(req.params.id, req.body);
    return sendSuccess(res, application, 'Application updated successfully');
  };

  changeStatus = async (req: Request, res: Response) => {
    const application = await this.service.changeStatus(req.params.id, req.body.status, req.body.note, req.user);
    return sendSuccess(res, application, 'Application status updated');
  };

  transitions = async (req: Request, res: Response) => {
    const application = await this.service.getById(req.params.id);
    const allowed = STATUS_TRANSITIONS[application.status as keyof typeof STATUS_TRANSITIONS] ?? [];
    return sendSuccess(res, { current: application.status, allowed });
  };

  timeline = async (req: Request, res: Response) => {
    const events = await this.service.timeline(req.params.id);
    return sendSuccess(res, events);
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'Application deleted successfully');
  };

  stats = async (req: Request, res: Response) => {
    const stats = await this.service.stats(req.user, req.query);
    return sendSuccess(res, stats);
  };
}
