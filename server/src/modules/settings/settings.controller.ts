import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { sendSuccess } from '../../lib/api-response';

export class SettingsController {
  private service = new SettingsService();

  listCurrencies = async (req: Request, res: Response) => {
    const currencies = await this.service.listCurrencies();
    return sendSuccess(res, currencies);
  };

  createCurrency = async (req: Request, res: Response) => {
    const currency = await this.service.createCurrency(req.body);
    return sendSuccess(res, currency, 'Currency created');
  };

  updateCurrency = async (req: Request, res: Response) => {
    const currency = await this.service.updateCurrency(req.params.id, req.body);
    return sendSuccess(res, currency, 'Currency updated');
  };

  getSettings = async (req: Request, res: Response) => {
    const { branchId, group } = req.query;
    const settings = await this.service.getSettings(branchId as string, group as string);
    return sendSuccess(res, settings);
  };

  updateSettings = async (req: Request, res: Response) => {
    const { branchId, group, settings } = req.body;
    await this.service.updateSettings(branchId, group, settings);
    return sendSuccess(res, null, 'Settings updated');
  };
}
