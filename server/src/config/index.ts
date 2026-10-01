import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('travel-visa-erpcrm'),
  JWT_AUDIENCE: z.string().default('travel-visa-erpcrm-client'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_SIZE_MB: z.string().default('10').transform((val) => parseInt(val, 10)),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

// Since dotenv is loaded in index.ts before importing this file, process.env should have the values.
// We fallback to checking required vars, if some are missing, we throw an error.
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

export const config = {
  env: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  db: {
    url: parsedEnv.data.DATABASE_URL,
  },
  jwt: {
    accessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
    refreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
    accessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
    issuer: parsedEnv.data.JWT_ISSUER,
    audience: parsedEnv.data.JWT_AUDIENCE,
  },
  storage: {
    driver: parsedEnv.data.STORAGE_DRIVER,
    uploadDir: parsedEnv.data.UPLOAD_DIR,
    maxSizeMB: parsedEnv.data.UPLOAD_MAX_SIZE_MB,
  },
  corsOrigin: parsedEnv.data.CORS_ORIGIN,
};
