import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

export interface StorageProvider {
  upload(file: Express.Multer.File, destination: string): Promise<string>;
  download(fileUrl: string): Promise<Buffer>;
  delete(fileUrl: string): Promise<void>;
  getSignedUrl(fileUrl: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(config.storage.uploadDir);
    // Ensure directory exists
    fs.mkdir(this.baseDir, { recursive: true }).catch(console.error);
  }

  async upload(file: Express.Multer.File, destination: string): Promise<string> {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const relativePath = path.join(destination, filename);
    const fullPath = path.join(this.baseDir, relativePath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
    
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  async download(fileUrl: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, fileUrl.replace(/^\/uploads\//, ''));
    return fs.readFile(filePath);
  }

  async delete(fileUrl: string): Promise<void> {
    const filePath = path.join(this.baseDir, fileUrl.replace(/^\/uploads\//, ''));
    await fs.unlink(filePath).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  async getSignedUrl(fileUrl: string): Promise<string> {
    // For local storage, we just return the URL
    return fileUrl;
  }
}

export class S3StorageProvider implements StorageProvider {
  async upload(file: Express.Multer.File, destination: string): Promise<string> {
    throw new Error('S3StorageProvider not configured');
  }

  async download(fileUrl: string): Promise<Buffer> {
    throw new Error('S3StorageProvider not configured');
  }

  async delete(fileUrl: string): Promise<void> {
    throw new Error('S3StorageProvider not configured');
  }

  async getSignedUrl(fileUrl: string): Promise<string> {
    throw new Error('S3StorageProvider not configured');
  }
}

export const createStorageProvider = (): StorageProvider => {
  if (config.storage.driver === 's3') {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
};

export const storage = createStorageProvider();
