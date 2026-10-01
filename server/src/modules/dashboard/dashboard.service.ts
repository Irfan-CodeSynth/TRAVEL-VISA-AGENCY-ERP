import { ApplicationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { resolveBranchScope } from '../../lib/branch-scope';

const OPEN_APPLICATION_STATUSES = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY', 'ADDITIONAL_DOCS',
] as ApplicationStatus[];

function monthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export class DashboardService {
  async getData(user: any, query: Record<string, unknown>) {
    const scope = resolveBranchScope(user, query);
    const branch = scope.branchId ? { branchId: scope.branchId } : {};
    const notDeleted = { deletedAt: null };
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const horizon = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    const expiryHorizon = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const [
      totalCustomers,
      newCustomersThisMonth,
      activeApplications,
      applicationStatusGroups,
      pendingDocuments,
      expiringDocuments,
      todaysFollowUps,
      overdueFollowUps,
      upcomingDepartures,
      upcomingAppointments,
      leadsByStatus,
      recentBookings,
      recentApplications,
      payments,
      invoices,
    ] = await Promise.all([
      prisma.customer.count({ where: { ...notDeleted, ...branch } }),
      prisma.customer.count({ where: { ...notDeleted, ...branch, createdAt: { gte: monthStart } } }),
      prisma.application.count({ where: { ...notDeleted, ...branch, status: { in: OPEN_APPLICATION_STATUSES } } }),
      prisma.application.groupBy({ by: ['status'], where: { ...notDeleted, ...branch }, _count: { _all: true } }),
      prisma.document.count({ where: { ...notDeleted, status: 'PENDING' } }),
      prisma.document.count({
        where: {
          ...notDeleted,
          status: { not: 'REJECTED' },
          expiryDate: { not: null, lte: expiryHorizon },
        },
      }),
      prisma.followUp.count({
        where: { ...notDeleted, ...branch, status: 'PENDING', scheduledAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.followUp.count({
        where: { ...notDeleted, ...branch, status: 'PENDING', scheduledAt: { lt: dayStart } },
      }),
      prisma.booking.count({
        where: { ...notDeleted, ...branch, status: 'CONFIRMED', travelDate: { gte: now, lte: horizon } },
      }),
      prisma.appointment.count({
        where: { ...notDeleted, ...branch, status: 'SCHEDULED', scheduledAt: { gte: now, lte: horizon } },
      }),
      prisma.lead.groupBy({ by: ['status'], where: { ...notDeleted, ...branch }, _count: { _all: true } }),
      prisma.booking.findMany({
        where: { ...notDeleted, ...branch },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.application.findMany({
        where: { ...notDeleted, ...branch },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          visaType: { select: { name: true } },
        },
      }),
      prisma.payment.findMany({
        where: { ...notDeleted, ...branch, status: 'COMPLETED' },
        select: { amount: true, isRefund: true, paidAt: true },
      }),
      prisma.invoice.findMany({
        where: {
          ...notDeleted,
          ...branch,
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const months = monthKeys(12);
    const revenueByMonth = new Map<string, number>(months.map((k) => [k, 0]));
    let monthRevenue = 0;
    let netReceived = 0;
    for (const p of payments) {
      const signed = Number(p.amount) * (p.isRefund ? -1 : 1);
      netReceived += signed;
      if (p.paidAt >= monthStart) monthRevenue += signed;
      const key = p.paidAt.toISOString().slice(0, 7);
      if (revenueByMonth.has(key)) revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + signed);
    }
    const outstanding = invoices.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0);

    const conversionDenominator = leadsByStatus.reduce((s, g) => s + g._count._all, 0);
    const wonLeads = leadsByStatus.find((g) => g.status === 'WON')?._count._all ?? 0;

    return {
      kpis: {
        totalCustomers,
        newCustomersThisMonth,
        activeApplications,
        pendingDocuments,
        expiringDocuments,
        todaysFollowUps,
        overdueFollowUps,
        monthlyRevenue: Math.round(monthRevenue * 100) / 100,
        outstanding,
        upcomingDepartures,
        upcomingAppointments,
        conversionRate: conversionDenominator
          ? Math.round((wonLeads / conversionDenominator) * 1000) / 10
          : 0,
        netReceived: Math.round(netReceived * 100) / 100,
      },
      revenueTrend: months.map((k) => ({ month: k, label: monthLabel(k), total: Math.round((revenueByMonth.get(k) ?? 0) * 100) / 100 })),
      applicationsByStatus: applicationStatusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      leadsByStatus: leadsByStatus.map((g) => ({ status: g.status, count: g._count._all })),
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        type: b.type,
        status: b.status,
        totalAmount: b.totalAmount,
        travelDate: b.travelDate,
        customerName: [b.customer.firstName, b.customer.lastName].filter(Boolean).join(' '),
      })),
      recentApplications: recentApplications.map((a) => ({
        id: a.id,
        applicationNumber: a.applicationNumber,
        status: a.status,
        visaType: a.visaType.name,
        customerName: [a.customer.firstName, a.customer.lastName].filter(Boolean).join(' '),
        updatedAt: a.updatedAt,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
