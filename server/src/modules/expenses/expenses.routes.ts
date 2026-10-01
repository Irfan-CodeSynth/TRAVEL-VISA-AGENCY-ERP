import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../middleware/async-handler';
import { auditLogMiddleware } from '../../middleware/audit.middleware';
import { sendSuccess, sendPaginated } from '../../lib/api-response';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { moneySchema } from '../../lib/money';
import { resolveBranchScope } from '../../lib/branch-scope';

const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'ADJUSTMENT'] as const;

const bodySchema = z.object({
  category: z.string().trim().min(2),
  title: z.string().trim().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  amount: moneySchema,
  currencyCode: z.string().trim().toUpperCase().length(3).optional(),
  expenseDate: z.coerce.date().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  description: z.string().trim().optional().nullable(),
  receiptUrl: z.string().trim().optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  category: z.string().trim().optional(),
  supplierId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

async function loadOr404(id: string) {
  const expense = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
  if (!expense) throw new NotFoundError('Expense not found');
  return expense;
}

class ExpensesController {
  list = async (req: any, res: any) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where: any = { deletedAt: null, ...resolveBranchScope(req.user, req.query) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.category) where.category = { equals: req.query.category, mode: 'insensitive' };
    if (req.query.supplierId) where.supplierId = req.query.supplierId;
    if (req.query.search) {
      where.OR = [
        { expenseNumber: { contains: req.query.search, mode: 'insensitive' } },
        { title: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);
    return sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  };

  getById = async (req: any, res: any) => {
    const expense = await prisma.expense.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!expense) throw new NotFoundError('Expense not found');
    return sendSuccess(res, expense);
  };

  create = async (req: any, res: any) => {
    const branchId = req.body.branchId || req.user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');
    if (req.body.supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: req.body.supplierId, deletedAt: null } });
      if (!supplier) throw new NotFoundError('Supplier not found');
    }
    const expenseNumber = await generateSequenceId('expense');
    const { branchId: _ignored, ...rest } = req.body;
    const expense = await prisma.expense.create({
      data: { ...rest, branchId, expenseNumber, createdById: req.user.id },
    });
    return sendSuccess(res, expense, 'Expense created successfully', 201);
  };

  update = async (req: any, res: any) => {
    const expense = await loadOr404(req.params.id);
    if (expense.status === 'APPROVED') throw new ConflictError('Approved expenses cannot be edited');
    if (req.body.supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: req.body.supplierId, deletedAt: null } });
      if (!supplier) throw new NotFoundError('Supplier not found');
    }
    const { branchId: _ignored, ...data } = req.body;
    const updated = await prisma.expense.update({ where: { id: expense.id }, data });
    return sendSuccess(res, updated, 'Expense updated successfully');
  };

  changeStatus = async (req: any, res: any) => {
    const expense = await loadOr404(req.params.id);
    const { status } = req.body;
    if (expense.status === status) return sendSuccess(res, expense, 'Expense status unchanged');
    if (expense.status !== 'PENDING') throw new ConflictError('Only pending expenses can be approved or rejected');
    const data: any = { status };
    if (status === 'APPROVED') {
      data.approvedByUserId = req.user.id;
      data.approvedAt = new Date();
    }
    const updated = await prisma.expense.update({ where: { id: expense.id }, data });
    return sendSuccess(res, updated, 'Expense status updated successfully');
  };

  delete = async (req: any, res: any) => {
    const expense = await loadOr404(req.params.id);
    if (expense.status === 'APPROVED') throw new ConflictError('Approved expenses cannot be deleted');
    await prisma.expense.update({ where: { id: expense.id }, data: { deletedAt: new Date() } });
    return sendSuccess(res, null, 'Expense deleted successfully');
  };
}

export const expensesRouter = Router();
const controller = new ExpensesController();

expensesRouter.use(authenticate);
expensesRouter.get('/', requirePermission('expenses.view'), validate(z.object({ query: listQuerySchema })), asyncHandler(controller.list));
expensesRouter.get('/:id', requirePermission('expenses.view'), asyncHandler(controller.getById));
expensesRouter.post('/', requirePermission('expenses.create'), validate(z.object({ body: bodySchema.extend({ branchId: z.string().uuid().optional() }) })), auditLogMiddleware('Expense'), asyncHandler(controller.create));
expensesRouter.patch('/:id', requirePermission('expenses.edit'), validate(z.object({ body: bodySchema.partial() })), auditLogMiddleware('Expense'), asyncHandler(controller.update));
expensesRouter.patch('/:id/status', requirePermission('expenses.edit'), validate(z.object({ body: z.object({ status: z.enum(EXPENSE_STATUSES) }) })), auditLogMiddleware('Expense'), asyncHandler(controller.changeStatus));
expensesRouter.delete('/:id', requirePermission('expenses.delete'), auditLogMiddleware('Expense'), asyncHandler(controller.delete));
