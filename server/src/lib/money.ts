import { z } from 'zod';

export const moneySchema = z.coerce.number().min(0).max(999_999_999);
export const optionalMoneySchema = z.coerce.number().min(0).max(999_999_999).optional().nullable();
export const currencyCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter code');
