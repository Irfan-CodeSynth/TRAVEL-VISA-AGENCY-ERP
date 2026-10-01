import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { sendError } from '../lib/api-response';
import { Prisma } from '@prisma/client';
import { config } from '../config';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    const errors = (err as any).errors;
    return sendError(res, err.message, err.code, err.statusCode, errors);
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 'Unique constraint failed', 'CONFLICT', 409, [{ field: err.meta?.target }]);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Record not found', 'NOT_FOUND', 404);
    }
  }

  // Generic error
  const message = config.env === 'production' ? 'Internal server error' : err.message;
  return sendError(res, message, 'INTERNAL_ERROR', 500);
};
