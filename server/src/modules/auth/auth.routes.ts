import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { loginSchema, refreshSchema, updateProfileSchema, changePasswordSchema } from './auth.validators';
import { asyncHandler } from '../../middleware/async-handler';

export const authRouter = Router();
const controller = new AuthController();

authRouter.post('/login', validate(loginSchema), asyncHandler(controller.login));
authRouter.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
authRouter.post('/logout', validate(refreshSchema), asyncHandler(controller.logout));
authRouter.post('/forgot-password', asyncHandler(controller.forgotPassword));
authRouter.post('/reset-password', asyncHandler(controller.resetPassword));

authRouter.use(authenticate);

authRouter.get('/me', asyncHandler(controller.getProfile));
authRouter.patch('/me', validate(updateProfileSchema), asyncHandler(controller.updateProfile));
authRouter.patch('/change-password', validate(changePasswordSchema), asyncHandler(controller.changePassword));
