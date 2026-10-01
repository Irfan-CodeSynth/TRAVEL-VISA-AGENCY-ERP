import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { generateSequenceId } from '../../lib/sequence';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { resolveBranchScope } from '../../lib/branch-scope';
import { APPOINTMENT_STATUSES } from './appointments.validators';

type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

const appointmentSelect = {
  id: true,
  type: true,
  status: true,
  subject: true,
  location: true,
  scheduledAt: true,
  durationMinutes: true,
  notes: true,
  rescheduleCount: true,
  branchId: true,
  applicationId: true,
  customerId: true,
  assignedToUserId: true,
  createdAt: true,
  application: { select: { id: true, applicationNumber: true, status: true, visaType: { select: { name: true } } } },
  customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true } },
};

export class AppointmentsService {
  async list(query: any, user: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = { deletedAt: null, ...resolveBranchScope(user, query) };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.applicationId) where.applicationId = query.applicationId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.from || query.to) {
      where.scheduledAt = {};
      if (query.from) where.scheduledAt.gte = new Date(String(query.from));
      if (query.to) where.scheduledAt.lte = new Date(String(query.to));
    }
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { application: { applicationNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({ where, skip, take: limit, select: appointmentSelect, orderBy: { scheduledAt: 'desc' } }),
      prisma.appointment.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null }, include: appointmentSelect });
    if (!appointment) throw new NotFoundError('Appointment not found');
    return appointment;
  }

  async create(data: any, user: any) {
    const branchId = data.branchId || user.branchId;
    if (!branchId) throw new ValidationError('branchId is required');

    let customerId = data.customerId || null;
    if (data.applicationId) {
      const application = await prisma.application.findFirst({ where: { id: data.applicationId, deletedAt: null } });
      if (!application) throw new ValidationError('Application not found');
      customerId = customerId || application.customerId;
    }
    if (customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
      if (!customer) throw new ValidationError('Customer not found');
    }

    return prisma.appointment.create({
      data: {
        branchId,
        subject: data.subject,
        type: data.type || 'INTERVIEW',
        scheduledAt: data.scheduledAt,
        location: data.location ?? null,
        durationMinutes: data.durationMinutes ?? null,
        notes: data.notes ?? null,
        applicationId: data.applicationId || null,
        customerId,
        assignedToUserId: data.assignedToUserId ?? user.id,
        createdById: user.id,
      },
      select: appointmentSelect,
    });
  }

  async update(id: string, data: any) {
    const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
    if (!appointment) throw new NotFoundError('Appointment not found');
    const { branchId, status, ...rest } = data;
    return prisma.appointment.update({ where: { id }, data: rest, select: appointmentSelect });
  }

  async changeStatus(id: string, status: AppointmentStatusValue, body: any, user: any) {
    const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
    if (!appointment) throw new NotFoundError('Appointment not found');
    if (appointment.status === status) {
      throw new ValidationError(`Appointment is already ${status.toLowerCase()}`);
    }
    if (appointment.status === 'CANCELLED') {
      throw new ValidationError('A cancelled appointment cannot change status');
    }

    const data: Prisma.AppointmentUpdateInput = { status };
    if (status === 'RESCHEDULED') {
      data.rescheduleCount = { increment: 1 };
      if (body.scheduledAt) data.scheduledAt = body.scheduledAt;
      else throw new ValidationError('scheduledAt is required when rescheduling');
    }
    if (body.notes) data.notes = body.notes;

    return prisma.appointment.update({ where: { id }, data, select: appointmentSelect });
  }

  async upcoming(user: any, days: number) {
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return prisma.appointment.findMany({
      where: {
        deletedAt: null,
        status: 'SCHEDULED',
        scheduledAt: { gte: now, lte: until },
        ...resolveBranchScope(user, {}),
      },
      select: appointmentSelect,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async delete(id: string) {
    const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
    if (!appointment) throw new NotFoundError('Appointment not found');
    await prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
