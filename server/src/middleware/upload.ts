import multer from 'multer';
import { config } from '../config';
import { ValidationError } from '../lib/errors';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: config.storage.maxSizeMB * 1024 * 1024 },
});

export const handleMulterError = (err: unknown, _req: any, _res: any, next: (err?: unknown) => void) => {
  if (err instanceof multer.MulterError) {
    next(new ValidationError(`Upload error: ${err.message}`));
    return;
  }
  next(err);
};
