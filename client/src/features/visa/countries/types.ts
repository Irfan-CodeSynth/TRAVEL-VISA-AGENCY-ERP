export interface Country {
  id: string;
  code: string;
  name: string;
  region: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
