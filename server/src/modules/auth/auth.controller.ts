import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../lib/api-response';

export class AuthController {
  private service = new AuthService();

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.service.login(email, password, req.ip || '', req.headers['user-agent'] || '');
    return sendSuccess(res, result, 'Logged in successfully');
  };

  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await this.service.refresh(refreshToken, req.ip || '', req.headers['user-agent'] || '');
    return sendSuccess(res, result, 'Token refreshed');
  };

  logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await this.service.logout(refreshToken);
    return sendSuccess(res, null, 'Logged out successfully');
  };

  forgotPassword = async (req: Request, res: Response) => {
    // Stub
    return sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  };

  resetPassword = async (req: Request, res: Response) => {
    // Stub
    return sendSuccess(res, null, 'Password reset successfully');
  };

  getProfile = async (req: Request, res: Response) => {
    const user = await this.service.getProfile(req.user.id);
    return sendSuccess(res, user);
  };

  updateProfile = async (req: Request, res: Response) => {
    const result = await this.service.updateProfile(req.user.id, req.body);
    return sendSuccess(res, result, 'Profile updated successfully');
  };

  changePassword = async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    await this.service.changePassword(req.user.id, oldPassword, newPassword);
    return sendSuccess(res, null, 'Password changed successfully');
  };
}
