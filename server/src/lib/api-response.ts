import { Response } from 'express';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(res: Response, data?: T, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res: Response, message: string, code = 'INTERNAL_ERROR', statusCode = 500, errors?: any[]) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    errors,
  });
};

export const sendPaginated = <T>(res: Response, data: T[], pagination: Pagination, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};
