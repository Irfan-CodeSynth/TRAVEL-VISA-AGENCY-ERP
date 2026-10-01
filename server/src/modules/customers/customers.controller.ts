import { Request, Response } from 'express';
import { CustomersService } from './customers.service';
import { sendSuccess, sendPaginated } from '../../lib/api-response';

export class CustomersController {
  private service = new CustomersService();

  list = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.list(req.query, req.user);
    return sendPaginated(res, data, pagination);
  };

  getById = async (req: Request, res: Response) => {
    const customer = await this.service.getById(req.params.id);
    return sendSuccess(res, customer);
  };

  summary = async (req: Request, res: Response) => {
    const summary = await this.service.getSummary(req.params.id);
    return sendSuccess(res, summary);
  };

  create = async (req: Request, res: Response) => {
    const customer = await this.service.create(req.body, req.user);
    return sendSuccess(res, customer, 'Customer created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    const customer = await this.service.update(req.params.id, req.body);
    return sendSuccess(res, customer, 'Customer updated successfully');
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'Customer deleted successfully');
  };
}
