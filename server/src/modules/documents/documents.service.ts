import path from 'path';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { storage } from '../../lib/storage';
import { resolveBranchScope } from '../../lib/branch-scope';

export const DOCUMENT_TYPES = [
  'PASSPORT', 'CNIC', 'B_FORM', 'PHOTO', 'APPLICATION_FORM', 'AIR_TICKET', 'HOTEL_VOUCHER',
  'INSURANCE', 'MEDICAL', 'POLICE_CERTIFICATE', 'BANK_STATEMENT', 'COVER_LETTER', 'NOC', 'OTHER',
] as const;

export const DOCUMENT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'] as const;

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

function sanitizeFileName(originalName: string): string {
  const base = path.basename(originalName).replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  return base || 'file';
}

async function assertRefs(data: { customerId?: string | null; applicationId?: string | null; bookingId?: string | null }) {
  if (data.customerId) {
    const c = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
    if (!c) throw new NotFoundError('Customer not found');
  }
  if (data.applicationId) {
    const a = await prisma.application.findFirst({ where: { id: data.applicationId, deletedAt: null } });
    if (!a) throw new NotFoundError('Application not found');
  }
  if (data.bookingId) {
    const b = await prisma.booking.findFirst({ where: { id: data.bookingId, deletedAt: null } });
    if (!b) throw new NotFoundError('Booking not found');
  }
}

const customerSelect = { select: { id: true, firstName: true, lastName: true, companyName: true } };

export class DocumentsService {
  async list(scope: Record<string, any>, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { deletedAt: null, ...scope };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.customerId) where.customerId = query.customerId;
    if (query.applicationId) where.applicationId = query.applicationId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.expiringSoon === 'true') {
      where.expiryDate = { lte: new Date(Date.now() + 30 * 24 * 3600 * 1000) };
      where.status = { not: 'REJECTED' };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { fileName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          customer: customerSelect,
          application: { select: { id: true, applicationNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string) {
    const document = await prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: customerSelect,
        application: { select: { id: true, applicationNumber: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
    });
    if (!document) throw new NotFoundError('Document not found');
    return document;
  }

  async upload(user: any, data: {
    title: string;
    type?: string;
    customerId?: string | null;
    applicationId?: string | null;
    bookingId?: string | null;
    expiryDate?: Date | null;
  }, file: Express.Multer.File) {
    if (!file) throw new ValidationError('File is required');
    if (file.size > MAX_SIZE_BYTES) throw new ValidationError('File exceeds the 10 MB limit');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new ValidationError(`Unsupported file type: ${file.mimetype}`);
    }
    await assertRefs(data);
    if (!user.branchId) throw new ValidationError('branchId is required');

    const storageKey = await storage.upload(file, `documents/${new Date().toISOString().slice(0, 7)}`);
    try {
      return await prisma.document.create({
        data: {
          branchId: user.branchId,
          title: data.title,
          type: (data.type as any) ?? 'OTHER',
          fileName: sanitizeFileName(file.originalname),
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          expiryDate: data.expiryDate ?? null,
          customerId: data.customerId ?? null,
          applicationId: data.applicationId ?? null,
          bookingId: data.bookingId ?? null,
          uploadedByUserId: user.id,
        },
      });
    } catch (err) {
      await storage.delete(storageKey).catch(() => undefined);
      throw err;
    }
  }

  async update(id: string, data: any) {
    const document = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    if (!document) throw new NotFoundError('Document not found');
    await assertRefs({ customerId: data.customerId, applicationId: data.applicationId, bookingId: data.bookingId });
    return prisma.document.update({
      where: { id: document.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate } : {}),
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.applicationId !== undefined ? { applicationId: data.applicationId } : {}),
        ...(data.bookingId !== undefined ? { bookingId: data.bookingId } : {}),
      },
    });
  }

  async changeStatus(id: string, status: string, userId: string, rejectReason?: string) {
    const document = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    if (!document) throw new NotFoundError('Document not found');
    if (document.status === status) return document;

    const allowed: Record<string, string[]> = {
      VERIFIED: ['PENDING', 'EXPIRED'],
      REJECTED: ['PENDING', 'VERIFIED'],
      EXPIRED: ['PENDING', 'VERIFIED'],
      PENDING: ['REJECTED'],
    };
    if (!allowed[status]?.includes(document.status)) {
      throw new ConflictError(`Cannot move document from ${document.status} to ${status}`);
    }
    if (status === 'REJECTED' && !rejectReason) {
      throw new ValidationError('rejectReason is required when rejecting a document');
    }

    const data: any = {
      status,
      verifiedByUserId: status === 'VERIFIED' ? userId : null,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      rejectReason: status === 'REJECTED' ? rejectReason : null,
    };
    return prisma.document.update({ where: { id: document.id }, data });
  }

  async getFile(document: any) {
    try {
      const buffer = await storage.download(document.storageKey);
      return buffer;
    } catch {
      throw new NotFoundError('Stored file is missing');
    }
  }

  async delete(id: string) {
    const document = await prisma.document.findFirst({ where: { id, deletedAt: null } });
    if (!document) throw new NotFoundError('Document not found');
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date() } });
    await storage.delete(document.storageKey).catch(() => undefined);
  }
}

export const documentsService = new DocumentsService();
