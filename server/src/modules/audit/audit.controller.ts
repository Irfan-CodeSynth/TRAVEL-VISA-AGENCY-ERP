import { Request, Response } from 'express';
import { AuditService } from './audit.service';
import { sendPaginated } from '../../lib/api-response';

export class AuditController {
  private service = new AuditService();

  getAuditLogs = async (req: Request, res: Response) => {
    const { data, pagination } = await this.service.getAuditLogs(req.query);
    return sendPaginated(res, data, pagination);
  };
}
