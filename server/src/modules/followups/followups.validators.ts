import { z } from 'zod';

const channelEnum = z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'VISIT', 'MEETING']);
const followUpStatusEnum = z.enum(['PENDING', 'COMPLETED', 'MISSED', 'CANCELLED']);
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const listFollowUpsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedToUserId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
  }),
});

const base = {
  type: channelEnum.optional(),
  subject: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  scheduledAt: z.coerce.date().optional(),
  status: followUpStatusEnum.optional(),
  priority: priorityEnum.optional(),
  customerId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
};

export const createFollowUpSchema = z.object({
  body: z.object({
    ...base,
    subject: z.string().min(1),
    scheduledAt: z.coerce.date(),
  }).refine((d) => !!d.customerId || !!d.leadId, {
    message: 'A follow-up must be linked to a customer or a lead',
    path: ['customerId'],
  }),
});

export const updateFollowUpSchema = z.object({ body: z.object(base) });
