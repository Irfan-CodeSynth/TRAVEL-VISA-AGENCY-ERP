import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors';

export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ForbiddenError('Not authenticated'));

    // Flatten all permissions from userRoles and branchUserRoles
    const userPerms = new Set<string>();
    
    const extractPerms = (rolesArray: any[]) => {
      for (const ur of rolesArray) {
        for (const rp of ur.role.rolePermissions) {
          const p = rp.permission;
          userPerms.add(`${p.module}.${p.action}`);
        }
      }
    };

    extractPerms(user.userRoles);
    extractPerms(user.branchUserRoles);

    const hasAll = permissions.every(p => userPerms.has(p));
    
    if (!hasAll) {
      return next(new ForbiddenError(`Missing required permissions: ${permissions.join(', ')}`));
    }
    next();
  };
};

export const requireAnyPermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ForbiddenError('Not authenticated'));

    const userPerms = new Set<string>();
    
    const extractPerms = (rolesArray: any[]) => {
      for (const ur of rolesArray) {
        for (const rp of ur.role.rolePermissions) {
          const p = rp.permission;
          userPerms.add(`${p.module}.${p.action}`);
        }
      }
    };

    extractPerms(user.userRoles);
    extractPerms(user.branchUserRoles);

    const hasAny = permissions.some(p => userPerms.has(p));
    
    if (!hasAny) {
      return next(new ForbiddenError(`Missing at least one of these permissions: ${permissions.join(', ')}`));
    }
    next();
  };
};
