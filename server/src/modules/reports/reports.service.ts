import { prisma } from '../../lib/prisma';
import { resolveBranchScope } from '../../lib/branch-scope';
import { ValidationError } from '../../lib/errors';

export const REPORT_TYPES = ['revenue', 'pipeline', 'receivables', 'bookings', 'expenses', 'commissions', 'margins'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const round = (n: number) => Math.round(n * 100) / 100;

function parseRange(query: Record<string, unknown>) {
  const to = query.to ? new Date(String(query.to)) : new Date();
  const from = query.from ? new Date(String(query.from)) : new Date(to.getTime() - 90 * 24 * 3600 * 1000);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new ValidationError('Invalid from/to dates');
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function monthSeries(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (d <= end) {
    keys.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return keys;
}

const notDeleted = { deletedAt: null };

class ReportsService {
  async revenue(scope: Record<string, any>, from: Date, to: Date) {
    const payments = await prisma.payment.findMany({
      where: { ...notDeleted, ...scope, status: 'COMPLETED', paidAt: { gte: from, lte: to } },
      select: { amount: true, isRefund: true, method: true, paidAt: true },
    });
    const expenses = await prisma.expense.aggregate({
      where: { ...notDeleted, ...scope, status: 'APPROVED', expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const byMonth = new Map<string, { received: number; refunded: number }>(
      monthSeries(from, to).map((k) => [k, { received: 0, refunded: 0 }])
    );
    const byMethod = new Map<string, { label: string; received: number; refunded: number }>();
    let received = 0;
    let refunded = 0;

    for (const p of payments) {
      const amount = Number(p.amount);
      const bucket = byMonth.get(p.paidAt.toISOString().slice(0, 7));
      if (bucket) {
        if (p.isRefund) bucket.refunded += amount;
        else bucket.received += amount;
      }
      let m = byMethod.get(p.method);
      if (!m) { m = { label: p.method, received: 0, refunded: 0 }; byMethod.set(p.method, m); }
      if (p.isRefund) { m.refunded += amount; refunded += amount; }
      else { m.received += amount; received += amount; }
    }

    const expenseTotal = Number(expenses._sum.amount ?? 0);
    return {
      summary: [
        { label: 'Received', value: round(received) },
        { label: 'Refunded', value: round(refunded) },
        { label: 'Net received', value: round(received - refunded) },
        { label: 'Approved expenses', value: round(expenseTotal) },
        { label: 'Net (received − refunds − expenses)', value: round(received - refunded - expenseTotal) },
      ],
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'received', label: 'Received', money: true },
        { key: 'refunded', label: 'Refunded', money: true },
        { key: 'net', label: 'Net', money: true },
      ],
      rows: [...byMonth.entries()].map(([month, v]) => ({
        month,
        received: round(v.received),
        refunded: round(v.refunded),
        net: round(v.received - v.refunded),
      })),
      extra: {
        title: 'By payment method',
        columns: [
          { key: 'label', label: 'Method' },
          { key: 'received', label: 'Received', money: true },
          { key: 'refunded', label: 'Refunded', money: true },
        ],
        rows: [...byMethod.values()].map((m) => ({ label: m.label, received: round(m.received), refunded: round(m.refunded) })),
      },
    };
  }

  async pipeline(scope: Record<string, any>) {
    const [leadsByStatus, appsByStatus, appAgg] = await Promise.all([
      prisma.lead.groupBy({ by: ['status'], where: { ...notDeleted, ...scope }, _count: { _all: true } }),
      prisma.application.groupBy({ by: ['status'], where: { ...notDeleted, ...scope }, _count: { _all: true } }),
      prisma.application.aggregate({ where: { ...notDeleted, ...scope }, _sum: { totalFees: true }, _count: { _all: true } }),
    ]);
    const leadTotal = leadsByStatus.reduce((s, g) => s + g._count._all, 0);
    const won = leadsByStatus.find((g) => g.status === 'WON')?._count._all ?? 0;
    const appsTotal = appsByStatus.reduce((s, g) => s + g._count._all, 0);
    const decided =
      (appsByStatus.find((g) => g.status === 'APPROVED')?._count._all ?? 0) +
      (appsByStatus.find((g) => g.status === 'REJECTED')?._count._all ?? 0);
    const approved = appsByStatus.find((g) => g.status === 'APPROVED')?._count._all ?? 0;

    return {
      summary: [
        { label: 'Leads', value: leadTotal },
        { label: 'Lead conversion %', value: leadTotal ? round((won / leadTotal) * 100) : 0 },
        { label: 'Applications', value: appsTotal },
        { label: 'Approval rate % (of decided)', value: decided ? round((approved / decided) * 100) : 0 },
        { label: 'Total declared fees', value: round(Number(appAgg._sum.totalFees ?? 0)) },
      ],
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'leads', label: 'Leads' },
        { key: 'applications', label: 'Applications' },
      ],
      rows: (() => {
        const leadStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
        const appStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY', 'ADDITIONAL_DOCS', 'APPROVED', 'REJECTED', 'RETURNED', 'WITHDRAWN'];
        const max = Math.max(leadStages.length, appStatuses.length);
        const rows: Record<string, any>[] = [];
        for (let i = 0; i < max; i++) {
          const ls = leadStages[i];
          const as = appStatuses[i];
          rows.push({
            stage: ls ?? as,
            leads: ls ? leadsByStatus.find((g) => g.status === ls)?._count._all ?? 0 : '',
            applications: as ? appsByStatus.find((g) => g.status === as)?._count._all ?? 0 : '',
          });
        }
        return rows;
      })(),
    };
  }

  async receivables(scope: Record<string, any>) {
    const invoices = await prisma.invoice.findMany({
      where: { ...notDeleted, ...scope, status: { notIn: ['DRAFT', 'CANCELLED', 'PAID', 'REFUNDED'] } },
      include: { customer: { select: { firstName: true, lastName: true, companyName: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const now = Date.now();
    const rows = invoices.map((i) => {
      const balance = round(Number(i.totalAmount) - Number(i.paidAmount));
      const daysOverdue = i.dueDate ? Math.max(0, Math.floor((now - i.dueDate.getTime()) / 86400000)) : null;
      return {
        invoiceNumber: i.invoiceNumber,
        customer: [i.customer.firstName, i.customer.lastName].filter(Boolean).join(' ') || i.customer.companyName || '—',
        issueDate: i.issueDate.toISOString().slice(0, 10),
        dueDate: i.dueDate ? i.dueDate.toISOString().slice(0, 10) : '—',
        total: round(Number(i.totalAmount)),
        paid: round(Number(i.paidAmount)),
        balance,
        status: i.status,
        daysOverdue: daysOverdue ?? '—',
      };
    });
    const totalOutstanding = round(rows.reduce((s, r) => s + Number(r.balance), 0));
    const overdueAmount = round(rows.reduce((s, r) => s + (Number(r.daysOverdue) > 0 ? Number(r.balance) : 0), 0));
    return {
      summary: [
        { label: 'Open invoices', value: rows.length },
        { label: 'Total outstanding', value: totalOutstanding },
        { label: 'Overdue amount', value: overdueAmount },
      ],
      columns: [
        { key: 'invoiceNumber', label: 'Invoice' },
        { key: 'customer', label: 'Customer' },
        { key: 'issueDate', label: 'Issued' },
        { key: 'dueDate', label: 'Due' },
        { key: 'total', label: 'Total', money: true },
        { key: 'paid', label: 'Paid', money: true },
        { key: 'balance', label: 'Balance', money: true },
        { key: 'status', label: 'Status' },
        { key: 'daysOverdue', label: 'Days overdue' },
      ],
      rows,
    };
  }

  async bookings(scope: Record<string, any>, from: Date, to: Date) {
    const bookings = await prisma.booking.findMany({
      where: { ...notDeleted, ...scope, createdAt: { gte: from, lte: to } },
      select: { type: true, status: true, totalAmount: true, paidAmount: true },
    });
    const byType = new Map<string, { count: number; total: number; paid: number }>();
    let total = 0;
    let paid = 0;
    for (const b of bookings) {
      let g = byType.get(b.type);
      if (!g) { g = { count: 0, total: 0, paid: 0 }; byType.set(b.type, g); }
      g.count += 1;
      g.total += Number(b.totalAmount);
      g.paid += Number(b.paidAmount);
      total += Number(b.totalAmount);
      paid += Number(b.paidAmount);
    }
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
    return {
      summary: [
        { label: 'Bookings', value: bookings.length },
        { label: 'Confirmed', value: confirmed },
        { label: 'Cancelled', value: cancelled },
        { label: 'Booked value', value: round(total) },
        { label: 'Collected', value: round(paid) },
      ],
      columns: [
        { key: 'type', label: 'Type' },
        { key: 'count', label: 'Count' },
        { key: 'total', label: 'Booked value', money: true },
        { key: 'paid', label: 'Paid', money: true },
      ],
      rows: [...byType.entries()].map(([type, g]) => ({
        type,
        count: g.count,
        total: round(g.total),
        paid: round(g.paid),
      })),
    };
  }

  async expenses(scope: Record<string, any>, from: Date, to: Date) {
    const rows = await prisma.expense.groupBy({
      by: ['category'],
      where: { ...notDeleted, ...scope, expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    const statusGroups = await prisma.expense.groupBy({
      by: ['status'],
      where: { ...notDeleted, ...scope, expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    const total = round(rows.reduce((s, g) => s + Number(g._sum.amount ?? 0), 0));
    return {
      summary: [
        { label: 'Categories used', value: rows.length },
        { label: 'Total (all statuses)', value: total },
        ...statusGroups.map((g) => ({ label: `Status ${g.status}`, value: round(Number(g._sum.amount ?? 0)) })),
      ],
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'count', label: 'Count' },
        { key: 'amount', label: 'Amount', money: true },
        { key: 'share', label: 'Share %' },
      ],
      rows: rows.map((g) => {
        const amount = round(Number(g._sum.amount ?? 0));
        return {
          category: g.category,
          count: g._count._all,
          amount,
          share: total ? round((amount / total) * 100) : 0,
        };
      }),
    };
  }

  async commissions(scope: Record<string, any>, from: Date, to: Date) {
    const rows = await prisma.commission.groupBy({
      by: ['agentId'],
      where: { ...notDeleted, ...scope, createdAt: { gte: from, lte: to } },
      _sum: { amount: true, baseAmount: true },
      _count: { _all: true },
    });
    const agents = await prisma.agent.findMany({
      where: { id: { in: rows.map((r) => r.agentId) } },
      select: { id: true, name: true, company: true },
    });
    const agentById = new Map(agents.map((a) => [a.id, a]));
    const detail: Record<string, { pending: number; approved: number; paid: number; rejected: number }> = {};
    const byStatus = await prisma.commission.groupBy({
      by: ['agentId', 'status'],
      where: { ...notDeleted, ...scope, agentId: { in: rows.map((r) => r.agentId) }, createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    for (const g of byStatus) {
      detail[g.agentId] = detail[g.agentId] ?? { pending: 0, approved: 0, paid: 0, rejected: 0 };
      const key = String(g.status).toLowerCase() as 'pending' | 'approved' | 'paid' | 'rejected';
      detail[g.agentId][key] = round(Number(g._sum.amount ?? 0));
    }
    const mapped = rows
      .map((r) => {
        const d = detail[r.agentId] ?? { pending: 0, approved: 0, paid: 0, rejected: 0 };
        return {
          agent: agentById.get(r.agentId)?.name ?? '—',
          company: agentById.get(r.agentId)?.company ?? '—',
          count: r._count._all,
          base: round(Number(r._sum.baseAmount ?? 0)),
          total: round(Number(r._sum.amount ?? 0)),
          paid: d.paid,
          payable: round(d.pending + d.approved),
        };
      })
      .sort((a, b) => b.total - a.total);
    return {
      summary: [
        { label: 'Agents earned', value: mapped.length },
        { label: 'Commission total', value: round(mapped.reduce((s, r) => s + r.total, 0)) },
        { label: 'Payable (pending + approved)', value: round(mapped.reduce((s, r) => s + r.payable, 0)) },
        { label: 'Paid out', value: round(mapped.reduce((s, r) => s + r.paid, 0)) },
      ],
      columns: [
        { key: 'agent', label: 'Agent' },
        { key: 'company', label: 'Company' },
        { key: 'count', label: 'Commissions' },
        { key: 'base', label: 'Base amount', money: true },
        { key: 'total', label: 'Commission', money: true },
        { key: 'payable', label: 'Payable', money: true },
        { key: 'paid', label: 'Paid', money: true },
      ],
      rows: mapped,
    };
  }

  async margins(scope: Record<string, any>, from: Date, to: Date) {
    const items = await prisma.bookingItem.findMany({
      where: {
        fareId: { not: null },
        unitBasePrice: { not: null },
        booking: { deletedAt: null, ...scope, status: { notIn: ['DRAFT', 'CANCELLED'] }, createdAt: { gte: from, lte: to } },
      },
      select: {
        quantity: true,
        unitPrice: true,
        unitBasePrice: true,
        lineTotal: true,
        fare: {
          select: {
            airline: { select: { code: true, name: true } },
            originAirport: { select: { iataCode: true, city: true } },
            destinationAirport: { select: { iataCode: true, city: true } },
          },
        },
      },
    });
    const byRoute = new Map<string, { tickets: number; sold: number; base: number }>();
    let tickets = 0;
    let sold = 0;
    let base = 0;
    for (const it of items) {
      const qty = it.quantity;
      const lineSold = Number(it.lineTotal);
      const lineBase = round(Number(it.unitBasePrice) * qty * 100) / 100;
      tickets += qty;
      sold += lineSold;
      base += lineBase;
      const f = it.fare;
      const key = `${f?.airline.code ?? '?'} · ${f?.originAirport.iataCode ?? '?'}→${f?.destinationAirport.iataCode ?? '?'}`;
      let g = byRoute.get(key);
      if (!g) { g = { tickets: 0, sold: 0, base: 0 }; byRoute.set(key, g); }
      g.tickets += qty;
      g.sold += lineSold;
      g.base += lineBase;
    }
    const profit = round(sold - base);
    return {
      summary: [
        { label: 'Tickets sold', value: tickets },
        { label: 'Sold value', value: round(sold) },
        { label: 'Base (market) cost', value: round(base) },
        { label: 'Agency margin earned', value: profit },
        { label: 'Margin %', value: sold ? round((profit / sold) * 100) : 0 },
      ],
      columns: [
        { key: 'route', label: 'Airline · route' },
        { key: 'tickets', label: 'Tickets' },
        { key: 'sold', label: 'Sold value', money: true },
        { key: 'base', label: 'Base cost', money: true },
        { key: 'profit', label: 'Margin earned', money: true },
      ],
      rows: [...byRoute.entries()]
        .map(([route, g]) => ({ route, tickets: g.tickets, sold: round(g.sold), base: round(g.base), profit: round(g.sold - g.base) }))
        .sort((a, b) => b.profit - a.profit),
    };
  }

  async get(user: any, type: string, query: Record<string, unknown>) {
    if (!REPORT_TYPES.includes(type as ReportType)) throw new ValidationError(`Unknown report: ${type}`);
    const scope = resolveBranchScope(user, query);
    const { from, to } = parseRange(query);
    switch (type as ReportType) {
      case 'revenue': return this.revenue(scope, from, to);
      case 'pipeline': return this.pipeline(scope);
      case 'receivables': return this.receivables(scope);
      case 'bookings': return this.bookings(scope, from, to);
      case 'expenses': return this.expenses(scope, from, to);
      case 'commissions': return this.commissions(scope, from, to);
      case 'margins': return this.margins(scope, from, to);
    }
  }
}

export const reportsService = new ReportsService();
