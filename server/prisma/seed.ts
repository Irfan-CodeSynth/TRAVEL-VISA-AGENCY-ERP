import { PrismaClient, RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Company (domain is not unique in schema — manual upsert)
  let company = await prisma.company.findFirst({ where: { domain: 'globaltravel.com' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Global Travel & Visa Agency',
        domain: 'globaltravel.com',
      }
    });
  }

  // 2. Branch
  const branch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: { name: 'Headquarters', city: 'Dubai', country: 'UAE', companyId: company.id },
    create: {
      companyId: company.id,
      name: 'Headquarters',
      code: 'HQ',
      city: 'Dubai',
      country: 'UAE'
    }
  });

  // 3. Permissions
  const permissionsData = [
    { module: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'leads', actions: ['view', 'create', 'edit', 'delete', 'convert'] },
    { module: 'applications', actions: ['view', 'create', 'edit', 'delete', 'submit'] },
    { module: 'documents', actions: ['view', 'upload', 'verify', 'delete'] },
    { module: 'appointments', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'bookings', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'quotations', actions: ['view', 'create', 'edit', 'send'] },
    { module: 'invoices', actions: ['view', 'create', 'edit', 'send'] },
    { module: 'payments', actions: ['view', 'create', 'refund'] },
    { module: 'expenses', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'suppliers', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'agents', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'commissions', actions: ['view', 'create', 'edit'] },
    { module: 'tasks', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'follow_ups', actions: ['view', 'create', 'edit'] },
    { module: 'communications', actions: ['view', 'create'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'visa', actions: ['view', 'manage'] },
    { module: 'packages', actions: ['view', 'manage'] },
    { module: 'flights', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'hotels', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'users', actions: ['view', 'manage'] },
    { module: 'roles', actions: ['view', 'manage'] },
    { module: 'settings', actions: ['view', 'manage'] },
    { module: 'audit', actions: ['view'] },
    { module: 'ai', actions: ['use'] },
  ];

  const allPermissions = [];
  for (const group of permissionsData) {
    for (const action of group.actions) {
      const p = await prisma.permission.upsert({
        where: { module_action_resource: { module: group.module, action, resource: 'all' } },
        update: {},
        create: { module: group.module, action, resource: 'all', description: `Can ${action} ${group.module}` }
      });
      allPermissions.push(p);
    }
  }

  // 4. Roles
  const rolesData = [
    { name: 'SUPER_ADMIN', displayName: 'Super Admin', isSystem: true, type: RoleType.INTERNAL },
    { name: 'ADMIN', displayName: 'Admin', isSystem: true, type: RoleType.INTERNAL },
    { name: 'BRANCH_MANAGER', displayName: 'Branch Manager', isSystem: false, type: RoleType.INTERNAL },
    { name: 'SALES_AGENT', displayName: 'Sales Agent', isSystem: false, type: RoleType.INTERNAL },
    { name: 'VISA_OFFICER', displayName: 'Visa Officer', isSystem: false, type: RoleType.INTERNAL },
    { name: 'TRAVEL_AGENT', displayName: 'Travel Agent', isSystem: false, type: RoleType.INTERNAL },
    { name: 'ACCOUNTANT', displayName: 'Accountant', isSystem: false, type: RoleType.INTERNAL },
    { name: 'DOCUMENT_OFFICER', displayName: 'Document Officer', isSystem: false, type: RoleType.INTERNAL },
    { name: 'CUSTOMER', displayName: 'Customer', isSystem: false, type: RoleType.EXTERNAL },
    { name: 'PARTNER_AGENT', displayName: 'Partner Agent', isSystem: false, type: RoleType.EXTERNAL },
  ];

  const roles = [];
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, displayName: r.displayName, isSystem: r.isSystem, roleType: r.type }
    });
    roles.push(role);
  }

  // 5. Assign ALL permissions to Super Admin
  const superAdmin = roles.find(r => r.name === 'SUPER_ADMIN')!;
  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: p.id }
    });
  }

  // 6. Assign appropriate permissions to other roles
  const admin = roles.find(r => r.name === 'ADMIN')!;
  for (const p of allPermissions.filter(p => !['roles', 'audit', 'settings'].includes(p.module))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: p.id } },
      update: {},
      create: { roleId: admin.id, permissionId: p.id }
    });
  }

  // 6b. Role → permission matrix for operational roles
  const permIndex = new Map(allPermissions.map(p => [`${p.module}.${p.action}`, p]));
  const grant = async (roleName: string, grants: { module: string; actions: string[] }[]) => {
    const role = roles.find(r => r.name === roleName)!;
    for (const g of grants) {
      for (const action of g.actions) {
        const p = permIndex.get(`${g.module}.${action}`);
        if (!p) {
          console.warn(`⚠️  Permission ${g.module}.${action} not found, skipping`);
          continue;
        }
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id }
        });
      }
    }
  };

  const full = ['view', 'create', 'edit', 'delete'];

  await grant('BRANCH_MANAGER', [
    { module: 'leads', actions: full }, { module: 'customers', actions: full },
    { module: 'follow_ups', actions: ['view', 'create', 'edit'] },
    { module: 'applications', actions: [...full, 'submit'] },
    { module: 'documents', actions: ['view', 'upload', 'verify', 'delete'] },
    { module: 'appointments', actions: full }, { module: 'bookings', actions: full },
    { module: 'flights', actions: full }, { module: 'hotels', actions: full },
    { module: 'packages', actions: ['view', 'manage'] },
    { module: 'quotations', actions: ['view', 'create', 'edit', 'send'] },
    { module: 'invoices', actions: ['view', 'create', 'edit', 'send'] },
    { module: 'payments', actions: ['view', 'create', 'refund'] },
    { module: 'expenses', actions: full }, { module: 'suppliers', actions: full },
    { module: 'agents', actions: full }, { module: 'commissions', actions: ['view', 'create', 'edit'] },
    { module: 'tasks', actions: full }, { module: 'communications', actions: ['view', 'create'] },
    { module: 'reports', actions: ['view', 'export'] }, { module: 'visa', actions: ['view', 'manage'] },
    { module: 'users', actions: ['view'] }, { module: 'settings', actions: ['view'] },
    { module: 'audit', actions: ['view'] }, { module: 'ai', actions: ['use'] },
  ]);

  await grant('SALES_AGENT', [
    { module: 'leads', actions: [...full, 'convert'] }, { module: 'customers', actions: full },
    { module: 'follow_ups', actions: ['view', 'create', 'edit'] },
    { module: 'communications', actions: ['view', 'create'] },
    { module: 'applications', actions: ['view', 'create', 'edit'] },
    { module: 'quotations', actions: ['view', 'create', 'edit', 'send'] },
    { module: 'bookings', actions: ['view', 'create', 'edit'] },
    { module: 'packages', actions: ['view'] }, { module: 'flights', actions: ['view'] },
    { module: 'hotels', actions: ['view'] }, { module: 'visa', actions: ['view'] },
    { module: 'invoices', actions: ['view', 'create'] }, { module: 'payments', actions: ['view'] },
    { module: 'reports', actions: ['view'] }, { module: 'ai', actions: ['use'] },
  ]);

  await grant('VISA_OFFICER', [
    { module: 'applications', actions: [...full, 'submit'] },
    { module: 'documents', actions: ['view', 'upload', 'verify'] },
    { module: 'appointments', actions: full },
    { module: 'visa', actions: ['view', 'manage'] },
    { module: 'customers', actions: ['view'] },
    { module: 'communications', actions: ['view', 'create'] },
    { module: 'follow_ups', actions: ['view', 'create'] },
    { module: 'ai', actions: ['use'] },
  ]);

  await grant('TRAVEL_AGENT', [
    { module: 'bookings', actions: full }, { module: 'flights', actions: full },
    { module: 'hotels', actions: full }, { module: 'packages', actions: ['view'] },
    { module: 'customers', actions: ['view', 'create'] },
    { module: 'quotations', actions: ['view', 'create'] },
    { module: 'invoices', actions: ['view'] }, { module: 'suppliers', actions: ['view'] },
    { module: 'communications', actions: ['view', 'create'] },
    { module: 'follow_ups', actions: ['view', 'create'] },
    { module: 'documents', actions: ['view', 'upload'] },
    { module: 'ai', actions: ['use'] },
  ]);

  await grant('ACCOUNTANT', [
    { module: 'invoices', actions: ['view', 'create', 'edit', 'send'] },
    { module: 'payments', actions: ['view', 'create', 'refund'] },
    { module: 'expenses', actions: full },
    { module: 'commissions', actions: ['view', 'create', 'edit'] },
    { module: 'quotations', actions: ['view'] }, { module: 'bookings', actions: ['view'] },
    { module: 'customers', actions: ['view'] }, { module: 'suppliers', actions: ['view', 'create', 'edit'] },
    { module: 'agents', actions: ['view'] },
    { module: 'reports', actions: ['view', 'export'] }, { module: 'ai', actions: ['use'] },
  ]);

  await grant('DOCUMENT_OFFICER', [
    { module: 'documents', actions: ['view', 'upload', 'verify', 'delete'] },
    { module: 'applications', actions: ['view', 'edit'] },
    { module: 'customers', actions: ['view'] },
    { module: 'appointments', actions: ['view', 'create', 'edit'] },
  ]);

  // 7. Create admin user
  const passwordHash = bcrypt.hashSync('Admin@123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@travelcrm.com' },
    update: { passwordHash },
    create: {
      email: 'admin@travelcrm.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      branchId: branch.id,
      isActive: true,
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: adminUser.id, roleId: superAdmin.id }
  });

  // 8. Create Currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true, exchangeRate: 1 },
    { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false, exchangeRate: 0.92 },
    { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false, exchangeRate: 0.79 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', isDefault: false, exchangeRate: 3.67 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', isDefault: false, exchangeRate: 3.75 },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', isDefault: false, exchangeRate: 278.5 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', isDefault: false, exchangeRate: 1.35 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', isDefault: false, exchangeRate: 1.53 },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { isDefault: c.isDefault, exchangeRate: c.exchangeRate },
      create: c
    });
  }

  // 9. Sequences
  const sequences = [
    { entity: 'customer', prefix: 'CUS', format: '{prefix}-{seq:6}' },
    { entity: 'lead', prefix: 'LD', format: '{prefix}-{seq:6}' },
    { entity: 'application', prefix: 'APP', format: '{prefix}-{seq:6}' },
    { entity: 'booking', prefix: 'BKG', format: '{prefix}-{seq:6}' },
    { entity: 'quotation', prefix: 'QT', format: '{prefix}-{seq:6}' },
    { entity: 'invoice', prefix: 'INV', format: '{prefix}-{seq:6}' },
    { entity: 'payment', prefix: 'PAY', format: '{prefix}-{seq:6}' },
    { entity: 'expense', prefix: 'EXP', format: '{prefix}-{seq:6}' },
    { entity: 'appointment', prefix: 'APT', format: '{prefix}-{seq:6}' },
    { entity: 'commission', prefix: 'COM', format: '{prefix}-{seq:6}' },
  ];

  for (const s of sequences) {
    await prisma.sequence.upsert({
      where: { entity: s.entity },
      update: {},
      create: { entity: s.entity, prefix: s.prefix, format: s.format, currentValue: 0 }
    });
  }

  // 10. Countries (master data)
  const countries = [
    { code: 'ARE', name: 'United Arab Emirates', region: 'Middle East', flagEmoji: '🇦🇪' },
    { code: 'SAU', name: 'Saudi Arabia', region: 'Middle East', flagEmoji: '🇸🇦' },
    { code: 'GBR', name: 'United Kingdom', region: 'Europe', flagEmoji: '🇬🇧' },
    { code: 'DEU', name: 'Germany', region: 'Europe', flagEmoji: '🇩🇪' },
    { code: 'FRA', name: 'France', region: 'Europe', flagEmoji: '🇫🇷' },
    { code: 'ITA', name: 'Italy', region: 'Europe', flagEmoji: '🇮🇹' },
    { code: 'NLD', name: 'Netherlands', region: 'Europe', flagEmoji: '🇳🇱' },
    { code: 'CAN', name: 'Canada', region: 'North America', flagEmoji: '🇨🇦' },
    { code: 'AUS', name: 'Australia', region: 'Oceania', flagEmoji: '🇦🇺' },
    { code: 'USA', name: 'United States', region: 'North America', flagEmoji: '🇺🇸' },
    { code: 'TUR', name: 'Türkiye', region: 'Europe/Asia', flagEmoji: '🇹🇷' },
    { code: 'MYS', name: 'Malaysia', region: 'Asia', flagEmoji: '🇲🇾' },
    { code: 'PAK', name: 'Pakistan', region: 'Asia', flagEmoji: '🇵🇰' },
    { code: 'IND', name: 'India', region: 'Asia', flagEmoji: '🇮🇳' },
  ];
  for (const c of countries) {
    await prisma.country.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
