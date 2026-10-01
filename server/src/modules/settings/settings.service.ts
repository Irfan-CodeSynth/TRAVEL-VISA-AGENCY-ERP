import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class SettingsService {
  async listCurrencies() {
    return prisma.currency.findMany({ orderBy: { isDefault: 'desc' } });
  }

  async createCurrency(data: any) {
    if (data.isDefault) {
      await prisma.currency.updateMany({ data: { isDefault: false } });
    }
    return prisma.currency.create({ data });
  }

  async updateCurrency(id: string, data: any) {
    if (data.isDefault) {
      await prisma.currency.updateMany({ data: { isDefault: false } });
    }
    return prisma.currency.update({ where: { id }, data });
  }

  async getSettings(branchId?: string, group?: string) {
    const where: Prisma.SettingWhereInput = {};
    if (branchId) where.branchId = branchId;
    if (group) where.group = group;

    return prisma.setting.findMany({ where });
  }

  async updateSettings(branchId: string | null, group: string, settingsArray: { key: string, value: any }[]) {
    return prisma.$transaction(async (tx) => {
      for (const item of settingsArray) {
        await tx.setting.upsert({
          where: { branchId_group_key: { branchId: branchId || '', group, key: item.key } },
          update: { value: item.value },
          create: { branchId: branchId || null, group, key: item.key, value: item.value }
        });
      }
    });
  }
}
