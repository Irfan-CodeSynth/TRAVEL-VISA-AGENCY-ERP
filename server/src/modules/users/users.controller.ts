import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { sendSuccess, sendPaginated } from '../../lib/api-response';

export class UsersController {
  private service = new UsersService();

  list = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.list(req.query);
    return sendPaginated(res, data, pagination);
  };

  getById = async (req: Request, res: Response) => {
    const user = await this.service.getById(req.params.id);
    return sendSuccess(res, user);
  };

  create = async (req: Request, res: Response) => {
    const user = await this.service.create(req.body);
    return sendSuccess(res, user, 'User created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    const user = await this.service.update(req.params.id, req.body);
    return sendSuccess(res, user, 'User updated successfully');
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'User deleted successfully');
  };
}
