import dotenv from 'dotenv';
import path from 'path';

// Must run before any module reads process.env (config/index.ts).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
