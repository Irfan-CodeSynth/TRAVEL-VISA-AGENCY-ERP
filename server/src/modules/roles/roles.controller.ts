import { Request, Response } from 'express';
import { RolesService } from './roles.service';
import { sendSuccess } from '../../lib/api-response';

export class RolesController {
  private service = new RolesService();

  list = async (req: Request, res: Response) => {
    const roles = await this.service.list();
    return sendSuccess(res, roles);
  };

  listPermissions = async (req: Request, res: Response) => {
    const permissions = await this.service.listPermissions();
    return sendSuccess(res, permissions);
  };

  getById = async (req: Request, res: Response) => {
    const role = await this.service.getById(req.params.id);
    return sendSuccess(res, role);
  };

  create = async (req: Request, res: Response) => {
    const role = await this.service.create(req.body);
    return sendSuccess(res, role, 'Role created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    const role = await this.service.update(req.params.id, req.body);
    return sendSuccess(res, role, 'Role updated successfully');
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'Role deleted successfully');
  };

  setPermissions = async (req: Request, res: Response) => {
    const result = await this.service.setPermissions(req.params.id, req.body.permissionIds);
    return sendSuccess(res, result, 'Permissions updated successfully');
  };
}
