import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuditAction } from '@prisma/client';

export const auditLogMiddleware = (entityType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const capture = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let action: AuditAction | null = null;
        if (req.method === 'POST') action = AuditAction.CREATE;
        else if (req.method === 'PATCH' || req.method === 'PUT') action = AuditAction.UPDATE;
        else if (req.method === 'DELETE') action = AuditAction.DELETE;

        if (action) {
          try {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            const entityId = parsed?.data?.id || req.params.id;

            prisma.auditLog.create({
              data: {
                userId: req.user?.id,
                action,
                entityType,
                entityId,
                description: `${req.method} ${req.originalUrl}`,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
              }
            }).catch(console.error);
          } catch {
            // ignore non-JSON bodies
          }
        }
      }
    };

    // Responses go through res.json (api-response helpers), but keep res.send covered too.
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      capture(body);
      return originalJson(body);
    };
    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      capture(body);
      return originalSend(body);
    };

    next();
  };
};
