import { z } from 'zod';

const customerTypeEnum = z.enum(['INDIVIDUAL', 'COMPANY']);
const customerStatusEnum = z.enum(['ACTIVE', 'VIP', 'INACTIVE', 'BLACKLISTED']);
const leadSourceEnum = z.enum(['WEBSITE', 'WALK_IN', 'REFERRAL', 'PHONE', 'SOCIAL_MEDIA', 'PARTNER_AGENT', 'EVENT']);

const base = {
  customerType: customerTypeEnum.optional(),
  firstName: z.string().min(1).optional().nullable(),
  lastName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  phone: z.string().min(5).optional(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  nationalId: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  passportExpiry: z.coerce.date().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  nationalityCountryId: z.string().uuid().optional().nullable(),
  occupation: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: customerStatusEnum.optional(),
  source: leadSourceEnum.optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
};

export const listCustomersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    customerType: z.string().optional(),
    assignedToUserId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
  }),
});

export const createCustomerSchema = z.object({
  body: z.object({
    ...base,
    firstName: z.string().min(1).optional().nullable(),
    phone: z.string().min(5),
    branchId: z.string().uuid().optional(),
  }).refine(
    (d) => d.customerType === 'COMPANY' ? !!d.companyName : !!(d.firstName && d.lastName),
    { message: 'Individual customers need firstName and lastName; companies need companyName', path: ['firstName'] }
  ),
});

export const updateCustomerSchema = z.object({ body: z.object(base) });
