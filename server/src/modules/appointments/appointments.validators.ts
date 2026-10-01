import { z } from 'zod';

export const APPOINTMENT_TYPES = ['BIOMETRICS', 'INTERVIEW', 'MEDICAL', 'DOCUMENT_SUBMISSION', 'COLLECTION', 'OTHER'] as const;
export const APPOINTMENT_STATUSES = ['SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED'] as const;

export const createAppointmentSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(2),
    type: z.enum(APPOINTMENT_TYPES).optional(),
    scheduledAt: z.coerce.date(),
    location: z.string().trim().optional().nullable(),
    durationMinutes: z.coerce.number().int().min(5).max(1440).optional().nullable(),
    notes: z.string().optional().nullable(),
    applicationId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional(),
  }),
});

export const updateAppointmentSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(2).optional(),
    type: z.enum(APPOINTMENT_TYPES).optional(),
    scheduledAt: z.coerce.date().optional(),
    location: z.string().trim().optional().nullable(),
    durationMinutes: z.coerce.number().int().min(5).max(1440).optional().nullable(),
    notes: z.string().optional().nullable(),
    applicationId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    assignedToUserId: z.string().uuid().optional().nullable(),
  }),
});

export const changeAppointmentStatusSchema = z.object({
  body: z.object({
    status: z.enum(APPOINTMENT_STATUSES),
    scheduledAt: z.coerce.date().optional(),
    notes: z.string().optional().nullable(),
  }),
});

export const listAppointmentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    applicationId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});
