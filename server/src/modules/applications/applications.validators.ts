import { z } from 'zod';
import { moneySchema } from '../../lib/money';

export const APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'AT_EMBASSY',
  'ADDITIONAL_DOCS',
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'WITHDRAWN',
] as const;

export const applicationStatusEnum = z.enum(APPLICATION_STATUSES);

export const listApplicationsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    customerId: z.string().uuid().optional(),
    visaTypeId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
  }),
});

export const createApplicationSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    visaTypeId: z.string().uuid(),
    applicantCount: z.coerce.number().int().min(1).max(100).optional(),
    referenceNumber: z.string().trim().optional().nullable(),
    totalFees: moneySchema.optional().nullable(),
    currencyCode: z.string().trim().toUpperCase().length(3).optional(),
    notes: z.string().optional().nullable(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional(),
  }),
});

export const updateApplicationSchema = z.object({
  body: z.object({
    applicantCount: z.coerce.number().int().min(1).max(100).optional(),
    referenceNumber: z.string().trim().optional().nullable(),
    totalFees: moneySchema.optional().nullable(),
    currencyCode: z.string().trim().toUpperCase().length(3).optional(),
    notes: z.string().optional().nullable(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    submissionDate: z.coerce.date().optional().nullable(),
    decisionDate: z.coerce.date().optional().nullable(),
  }),
});

export const changeStatusSchema = z.object({
  body: z.object({
    status: applicationStatusEnum,
    note: z.string().trim().optional().nullable(),
  }),
});
