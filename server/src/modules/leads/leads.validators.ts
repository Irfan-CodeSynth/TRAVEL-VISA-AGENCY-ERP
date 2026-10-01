import { z } from 'zod';
import { moneySchema } from '../../lib/money';

const leadSourceEnum = z.enum(['WEBSITE', 'WALK_IN', 'REFERRAL', 'PHONE', 'SOCIAL_MEDIA', 'PARTNER_AGENT', 'EVENT']);
const leadStatusEnum = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']);

export const listLeadsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    assignedToUserId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
  }),
});

export const createLeadSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    phone: z.string().min(5),
    email: z.string().email().optional().or(z.literal('')),
    whatsapp: z.string().optional(),
    source: leadSourceEnum.optional(),
    status: leadStatusEnum.optional(),
    interestedDestinationId: z.string().uuid().optional().nullable(),
    estimatedBudget: moneySchema.optional().nullable(),
    budgetCurrencyCode: z.string().length(3).optional().nullable(),
    servicesInterested: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional(),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional().nullable(),
    companyName: z.string().optional().nullable(),
    phone: z.string().min(5).optional(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    whatsapp: z.string().optional().nullable(),
    source: leadSourceEnum.optional(),
    status: leadStatusEnum.optional(),
    interestedDestinationId: z.string().uuid().optional().nullable(),
    estimatedBudget: moneySchema.optional().nullable(),
    budgetCurrencyCode: z.string().length(3).optional().nullable(),
    servicesInterested: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    lostReason: z.string().optional().nullable(),
  }),
});
