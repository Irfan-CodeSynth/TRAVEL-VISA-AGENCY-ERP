import { Request, Response } from 'express';
import { LeadsService } from './leads.service';
import { sendSuccess, sendPaginated } from '../../lib/api-response';

export class LeadsController {
  private service = new LeadsService();

  list = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.list(req.query, req.user);
    return sendPaginated(res, data, pagination);
  };

  getById = async (req: Request, res: Response) => {
    const lead = await this.service.getById(req.params.id);
    return sendSuccess(res, lead);
  };

  create = async (req: Request, res: Response) => {
    const lead = await this.service.create(req.body, req.user);
    return sendSuccess(res, lead, 'Lead created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    const lead = await this.service.update(req.params.id, req.body);
    return sendSuccess(res, lead, 'Lead updated successfully');
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'Lead deleted successfully');
  };

  convert = async (req: Request, res: Response) => {
    const customer = await this.service.convert(req.params.id, req.user, req.body);
    return sendSuccess(res, customer, 'Lead converted to customer', 201);
  };

  lose = async (req: Request, res: Response) => {
    const lead = await this.service.markLost(req.params.id, req.body?.reason);
    return sendSuccess(res, lead, 'Lead marked as lost');
  };
}
