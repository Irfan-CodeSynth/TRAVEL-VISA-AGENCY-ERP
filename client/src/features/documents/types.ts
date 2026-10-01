import type { DocumentStatus, DocumentType } from "./shared/constants";

export interface Document {
  id: string;
  branchId: string;
  type: DocumentType;
  title: string;
  fileName: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  expiryDate: string | null;
  customerId: string | null;
  customer?: { id: string; firstName: string; lastName: string | null; companyName: string | null } | null;
  applicationId: string | null;
  application?: { id: string; applicationNumber: string } | null;
  bookingId: string | null;
  booking?: { id: string; bookingNumber: string } | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectReason: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}
