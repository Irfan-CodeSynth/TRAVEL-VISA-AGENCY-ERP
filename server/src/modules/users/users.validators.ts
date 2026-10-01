import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    branchId: z.string().uuid().optional(),
    roleId: z.string().uuid().optional(),
  })
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    branchId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).optional(),
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    branchId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).optional(),
  })
});
