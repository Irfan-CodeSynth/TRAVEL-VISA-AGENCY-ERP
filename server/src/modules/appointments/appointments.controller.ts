import { Request, Response } from 'express';
import { AppointmentsService } from './appointments.service';
import { sendSuccess, sendPaginated } from '../../lib/api-response';

export class AppointmentsController {
  private service = new AppointmentsService();

  list = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.list(req.query, req.user);
    return sendPaginated(res, data, pagination);
  };

  upcoming = async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const data = await this.service.upcoming(req.user, days);
    return sendSuccess(res, data);
  };

  getById = async (req: Request, res: Response) => {
    const appointment = await this.service.getById(req.params.id);
    return sendSuccess(res, appointment);
  };

  create = async (req: Request, res: Response) => {
    const appointment = await this.service.create(req.body, req.user);
    return sendSuccess(res, appointment, 'Appointment created successfully', 201);
  };

  update = async (req: Request, res: Response) => {
    const appointment = await this.service.update(req.params.id, req.body);
    return sendSuccess(res, appointment, 'Appointment updated successfully');
  };

  changeStatus = async (req: Request, res: Response) => {
    const appointment = await this.service.changeStatus(req.params.id, req.body.status, req.body, req.user);
    return sendSuccess(res, appointment, 'Appointment status updated');
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return sendSuccess(res, null, 'Appointment deleted successfully');
  };
}
