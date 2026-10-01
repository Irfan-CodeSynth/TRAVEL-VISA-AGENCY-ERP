import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';

export const settingsRouter = Router();
export const currenciesRouter = Router();
const controller = new SettingsController();

// Currencies (public list)
currenciesRouter.get('/', asyncHandler(controller.listCurrencies));

currenciesRouter.use(authenticate);
currenciesRouter.post('/', requirePermission('settings.manage'), asyncHandler(controller.createCurrency));
currenciesRouter.patch('/:id', requirePermission('settings.manage'), asyncHandler(controller.updateCurrency));

// Settings
settingsRouter.use(authenticate);
settingsRouter.get('/', requirePermission('settings.view'), asyncHandler(controller.getSettings));
settingsRouter.put('/', requirePermission('settings.manage'), asyncHandler(controller.updateSettings));
