/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Rng, DAY_MS } from './prng';
import {
  MALE_FIRST, FEMALE_FIRST, LAST, COMPANY_NAMES, CITIES, OCCUPATIONS,
  AIRLINES, ROUTES, HOTELS, PACKAGE_DEFS, EXPENSE_CATEGORIES, DOC_TITLES,
} from './names';

// Deterministic full-dataset seed: mulberry32(42) drives every random choice.
// Timestamps derive from a single BASE fixed at module load so offsets stay consistent.

const rng = new Rng(42);
const BASE = (() => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d.getTime();
})();

const day = (offset: number) => new Date(BASE + offset * DAY_MS);
const hour = (offset: number, h: number) => new Date(BASE + offset * DAY_MS + h * 3600000);
const uid = () => crypto.randomUUID();
const r2 = (n: number) => Math.round(n * 100) / 100;
const pad = (prefix: string, i: number) => `${prefix}-${String(i).padStart(6, '0')}`;
const phone = () => `+92 3${rng.int(0, 4)}${rng.int(1, 9)} ${rng.int(2000000, 9999999)}`;

const RATE: Record<string, number> = { USD: 1, AED: 3.67, SAR: 3.75, PKR: 278.5, GBP: 0.79, EUR: 0.92 };
const money = (usd: number, currency: string) => r2(usd * RATE[currency]);
const branchCurrency = (isHQ: boolean) =>
  isHQ ? rng.weighted<string>([['AED', 5], ['USD', 3], ['SAR', 1], ['GBP', 1]])
       : rng.weighted<string>([['PKR', 5], ['AED', 2], ['USD', 2], ['SAR', 1]]);

export const STAFF_DEFS = [
  { email: 'sara.admin@travelcrm.com', first: 'Sara', last: 'Qureshi', role: 'ADMIN', hq: true },
  { email: 'faisal.manager@travelcrm.com', first: 'Faisal', last: 'Hussain', role: 'BRANCH_MANAGER', hq: true },
  { email: 'taher.manager@travelcrm.com', first: 'Taher', last: 'Mirza', role: 'BRANCH_MANAGER', hq: false },
  { email: 'sana.sales@travelcrm.com', first: 'Sana', last: 'Sheikh', role: 'SALES_AGENT', hq: true },
  { email: 'omar.sales@travelcrm.com', first: 'Omar', last: 'Butt', role: 'SALES_AGENT', hq: false },
  { email: 'mariam.sales@travelcrm.com', first: 'Mariam', last: 'Nawaz', role: 'SALES_AGENT', hq: true },
  { email: 'ayesha.visa@travelcrm.com', first: 'Ayesha', last: 'Raza', role: 'VISA_OFFICER', hq: true },
  { email: 'karan.visa@travelcrm.com', first: 'Karan', last: 'Sharma', role: 'VISA_OFFICER', hq: false },
  { email: 'zara.travel@travelcrm.com', first: 'Zara', last: 'Farooq', role: 'TRAVEL_AGENT', hq: true },
  { email: 'junaid.accounts@travelcrm.com', first: 'Junaid', last: 'Ali', role: 'ACCOUNTANT', hq: true },
  { email: 'nimat.docs@travelcrm.com', first: 'Nimat', last: 'Baig', role: 'DOCUMENT_OFFICER', hq: true },
] as const;

export const STAFF_PASSWORD = 'Staff@123456';

const PERSON = () => {
  const female = rng.chance(0.45);
  const first = female ? rng.pick(FEMALE_FIRST) : rng.pick(MALE_FIRST);
  return { first, last: rng.pick(LAST), gender: female ? 'FEMALE' : 'MALE' };
};

const VISA_CATEGORIES = ['TOURIST', 'BUSINESS', 'WORK', 'STUDENT', 'RESIDENCE', 'VISIT', 'PILGRIMAGE', 'TRANSIT', 'MEDICAL'];

export async function seedDataset(prisma: PrismaClient) {
  const log = (...a: unknown[]) => console.log(...a);
  const counters = { customer: 0, lead: 0, application: 0, booking: 0, quotation: 0, invoice: 0, payment: 0, expense: 0, commission: 0, appointment: 0 };
  const num = (entity: keyof typeof counters, prefix: string) => pad(prefix, ++counters[entity]);

  // ── Branches & staff users ────────────────────────────────────────────────
  const hq = await prisma.branch.findFirstOrThrow({ where: { code: 'HQ' } });
  const khi = await prisma.branch.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      companyId: hq.companyId, name: 'Karachi Branch', code: 'KHI', city: 'Karachi', country: 'Pakistan',
    },
  });
  log(`Branches: HQ=${hq.id} KHI=${khi.id}`);

  const staffHash = bcrypt.hashSync(STAFF_PASSWORD, 12);
  const roles = await prisma.role.findMany();
  const roleByName = new Map(roles.map((r) => [r.name, r]));
  const staff: { id: string; hq: boolean; role: string }[] = [];
  for (const s of STAFF_DEFS) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash: staffHash, isActive: true },
      create: {
        id: uid(), email: s.email, passwordHash: staffHash,
        firstName: s.first, lastName: s.last, phone: phone(),
        branchId: s.hq ? hq.id : khi.id, isActive: true,
      },
    });
    const role = roleByName.get(s.role)!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: role.id } },
      update: {}, create: { userId: u.id, roleId: role.id },
    });
    staff.push({ id: u.id, hq: s.hq, role: s.role });
  }
  const usersBy = (role: string) => staff.filter((s) => s.role === role);
  const pickUser = (role: string) => rng.pick(usersBy(role));
  const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@travelcrm.com' } });
  log(`Staff users: ${staff.length}`);

  // ── Visa types (2–4 per country) ─────────────────────────────────────────
  const countries = await prisma.country.findMany({ where: { isActive: true } });
  const visaTypes: { id: string; countryId: string; name: string; processingDays: number }[] = [];
  const vtRows: Prisma.VisaTypeCreateManyInput[] = [];
  for (const c of countries) {
    const cats = rng.shuffle(VISA_CATEGORIES).slice(0, rng.int(2, 4));
    for (const cat of cats) {
      const id = uid();
      const price = money(rng.int(40, 320), 'USD');
      const pd = rng.int(3, 30);
      vtRows.push({
        id, countryId: c.id, code: cat, name: `${c.name} ${cat}`, category: cat,
        allowedStayDays: rng.int(7, 90), validityDays: rng.int(30, 365), processingDays: pd,
        price, currencyCode: 'USD', isActive: true,
        requirements: 'Passport (6+ months validity), photos 4x6, bank statement 6 months, application form, cover letter',
      });
      visaTypes.push({ id, countryId: c.id, name: `${c.name} ${cat}`, processingDays: pd });
    }
  }
  await prisma.visaType.createMany({ data: vtRows });
  log(`Visa types: ${vtRows.length}`);

  // ── Suppliers & agents ────────────────────────────────────────────────────
  const supplierDefs = [
    { name: 'Emirates Group Corporate Desk', type: 'AIRLINE', country: 'UAE', city: 'Dubai' },
    { name: 'AlFuttaim Travel Supply', type: 'TRANSPORT', country: 'UAE', city: 'Dubai' },
    { name: 'Haramain Hospitality Co', type: 'HOTEL', country: 'SAU', city: 'Jeddah' },
    { name: 'Karachi Visa Services', type: 'VISA_AGENT', country: 'PAK', city: 'Karachi' },
    { name: 'AIG Travel Insurance ME', type: 'INSURANCE', country: 'UAE', city: 'Dubai' },
    { name: 'UKVACS Pakistan Ltd', type: 'EMBASSY', country: 'PAK', city: 'Islamabad' },
  ] as const;
  const suppliers = [] as { id: string }[];
  for (const s of supplierDefs) {
    const p = PERSON();
    const row = await prisma.supplier.create({
      data: {
        id: uid(), name: s.name, type: s.type as any, country: s.country, city: s.city,
        email: `${s.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 12)}@supply.example`,
        phone: phone(), contactPerson: `${p.first} ${p.last}`, isActive: true,
      },
    });
    suppliers.push({ id: row.id });
  }
  const agentRows: { id: string; name: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const p = PERSON();
    const company = rng.chance(0.5) ? rng.pick(COMPANY_NAMES) + ' (Rep)' : null;
    const row = await prisma.agent.create({
      data: {
        id: uid(), name: `${p.first} ${p.last}`, company,
        email: `agent${i + 1}@partners.example`, phone: phone(),
        city: rng.pick([...CITIES.UAE, ...CITIES.PAK]), country: rng.chance(0.5) ? 'UAE' : 'Pakistan',
        commissionType: 'PERCENTAGE', commissionRate: rng.int(2, 8), currencyCode: 'USD', isActive: true,
        contactPerson: `${p.first} ${p.last}`,
      },
    });
    agentRows.push({ id: row.id, name: row.name });
  }
  log('Suppliers: 6, Agents: 8');

  // ── Flights / hotels / packages (global inventory) ───────────────────────
  const flights = [] as { id: string; airline: string; route: string; fare: number }[];
  for (let i = 0; i < 15; i++) {
    const [oc, oa, dc, da] = ROUTES[i % ROUTES.length];
    const al = AIRLINES[i % AIRLINES.length];
    const fare = money(rng.int(180, 1400), 'USD');
    const dep = hour(rng.int(1, 25), rng.int(1, 22));
    const id = uid();
    await prisma.flight.create({
      data: {
        id, airline: al.name, flightNumber: `${al.code}${rng.int(100, 999)}`,
        originCity: oc, originAirport: oa, destinationCity: dc, destinationAirport: da,
        departureTime: dep, arrivalTime: new Date(dep.getTime() + rng.int(2, 9) * 3600000),
        classType: rng.pick(['ECONOMY', 'BUSINESS', 'ECONOMY', 'ECONOMY']),
        baseFare: fare, currencyCode: 'USD', seatsAvailable: rng.int(2, 40), isActive: true,
      },
    });
    flights.push({ id, airline: al.name, route: `${oa} → ${da}`, fare });
  }
  const hotels = [] as { id: string; name: string; rate: number }[];
  for (let i = 0; i < 12; i++) {
    const h = HOTELS[i];
    const rate = money(rng.int(60, 320), 'USD');
    const id = uid();
    await prisma.hotel.create({
      data: {
        id, name: h.name, city: h.city, country: h.country,
        address: `${rng.int(1, 90)} ${h.city} ${rng.pick(['Street', 'Road', 'Avenue'])}`,
        starRating: h.stars, roomType: rng.pick(['Standard', 'Deluxe', 'Family', 'Suite']),
        ratePerNight: rate, currencyCode: 'USD', roomsAvailable: rng.int(3, 30),
        contactPhone: phone(), isActive: true,
      },
    });
    hotels.push({ id, name: h.name, rate });
  }
  const packages = [] as { id: string; name: string; price: number }[];
  for (let i = 0; i < PACKAGE_DEFS.length; i++) {
    const p = PACKAGE_DEFS[i];
    const id = uid();
    await prisma.package.create({
      data: {
        id, name: p.name, code: `PKG-${String(i + 1).padStart(2, '0')}`, type: p.type,
        destination: p.dest, durationDays: p.days, price: p.price, currencyCode: 'USD',
        includes: p.includes, isActive: true,
      },
    });
    packages.push({ id, name: p.name, price: p.price });
  }
  log(`Inventory: ${flights.length} flights, ${hotels.length} hotels, ${packages.length} packages`);

  // ── Customers ─────────────────────────────────────────────────────────────
  const customers: { id: string; branchId: string; name: string; hq: boolean }[] = [];
  const custRows: Prisma.CustomerCreateManyInput[] = [];
  for (let i = 0; i < 36; i++) {
    const isHQ = rng.chance(0.62);
    const p = PERSON();
    const isCompany = i < 4;
    const id = uid();
    const status = isCompany ? 'ACTIVE' : rng.weighted<string>([['ACTIVE', 22], ['VIP', 5], ['INACTIVE', 2], ['BLACKLISTED', 1]]);
    const passportSoon = rng.chance(0.08);
    custRows.push({
      id, customerNumber: num('customer', 'CUS'), branchId: isHQ ? hq.id : khi.id,
      customerType: isCompany ? 'COMPANY' : 'INDIVIDUAL',
      firstName: isCompany ? 'Authorized' : p.first, lastName: isCompany ? 'Signatory' : p.last,
      companyName: isCompany ? COMPANY_NAMES[i % COMPANY_NAMES.length] : null,
      phone: phone(), whatsapp: rng.chance(0.6) ? phone() : null,
      email: isCompany ? `ops@${COMPANY_NAMES[i % COMPANY_NAMES.length].toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}.example` : `${p.first.toLowerCase()}.${p.last.toLowerCase()}${i}@mail.example`,
      nationalId: `${rng.int(10000, 99999)}-${rng.int(1000000, 9999999)}-${rng.int(0, 9)}`,
      passportNumber: `A${rng.int(1000000, 9999999)}`,
      passportExpiry: passportSoon ? day(rng.int(15, 55)) : day(rng.int(150, 3000)),
      gender: isCompany ? null : (p.gender as any),
      dateOfBirth: day(-rng.int(7000, 19000)),
      nationalityCountryId: rng.pick(countries).id,
      occupation: rng.pick(OCCUPATIONS),
      city: rng.pick(isHQ ? [...CITIES.UAE, ...CITIES.PAK] : CITIES.PAK),
      address: `House ${rng.int(1, 500)}, ${rng.pick(['Gulshan', 'DHA', 'Marina', 'Business Bay', 'Deira', 'Saddar'])}`,
      status: status as any,
      source: rng.pick(['WEBSITE', 'REFERRAL', 'WALK_IN', 'PHONE', 'SOCIAL_MEDIA', 'PARTNER_AGENT', 'EVENT']) as any,
      assignedToUserId: rng.pick(usersBy('SALES_AGENT')).id,
      createdById: admin.id,
      notes: rng.chance(0.2) ? 'Prefers WhatsApp contact. Referred repeat family cases.' : null,
      createdAt: day(-rng.int(0, 320)),
    });
    customers.push({ id, branchId: isHQ ? hq.id : khi.id, name: isCompany ? COMPANY_NAMES[i % COMPANY_NAMES.length] : `${p.first} ${p.last}`, hq: isHQ });
  }
  await prisma.customer.createMany({ data: custRows });
  log(`Customers: ${custRows.length}`);

  // ── Leads ─────────────────────────────────────────────────────────────────
  const leadRows: Prisma.LeadCreateManyInput[] = [];
  for (let i = 0; i < 32; i++) {
    const isHQ = rng.chance(0.6);
    const p = PERSON();
    const status = rng.weighted<string>([['NEW', 7], ['CONTACTED', 6], ['QUALIFIED', 4], ['PROPOSAL', 3], ['WON', 8], ['LOST', 4]]);
    leadRows.push({
      id: uid(), leadNumber: num('lead', 'LD'), branchId: isHQ ? hq.id : khi.id,
      firstName: p.first, lastName: p.last,
      phone: phone(), whatsapp: rng.chance(0.5) ? phone() : null,
      email: `${p.first.toLowerCase()}${i}@lead.example`,
      source: rng.weighted<any>([['WEBSITE', 8], ['REFERRAL', 7], ['WALK_IN', 5], ['SOCIAL_MEDIA', 5], ['PHONE', 3], ['PARTNER_AGENT', 3], ['EVENT', 2]]),
      status: status as any,
      interestedDestinationId: rng.pick(countries).id,
      estimatedBudget: money(rng.int(600, 9000), 'USD'), budgetCurrencyCode: 'USD',
      servicesInterested: rng.pick(['UK Visit visa', 'Umrah package', 'Schengen tourist', 'Canada PR consult', 'Turkey work permit', 'Family visas']),
      description: 'New enquiry from marketing campaign.',
      assignedToUserId: rng.pick(usersBy('SALES_AGENT')).id,
      createdById: admin.id,
      createdAt: day(-rng.int(0, 200)),
      ...(status === 'LOST' ? { lostReason: rng.pick(['Price objection', 'Went to competitor', 'Travel plans cancelled']) } : {}),
    });
  }
  await prisma.lead.createMany({ data: leadRows });
  // Mark 4 WON leads as converted to existing customers (LeadConversion is 1:1 unique).
  const wonLeads = leadRows.filter((l) => l.status === 'WON').slice(0, 4);
  for (const [i, l] of wonLeads.entries()) {
    await prisma.lead.update({
      where: { id: l.id as string },
      data: { convertedCustomerId: customers[i * 7].id, convertedAt: day(-rng.int(5, 60)) },
    });
  }
  log(`Leads: ${leadRows.length}`);

  // ── Applications + status logs ────────────────────────────────────────────
  const APP_CHAIN: Record<string, string[]> = {
    DRAFT: ['DRAFT'],
    SUBMITTED: ['DRAFT', 'SUBMITTED'],
    UNDER_REVIEW: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'],
    AT_EMBASSY: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY'],
    ADDITIONAL_DOCS: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY', 'ADDITIONAL_DOCS'],
    APPROVED: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY', 'APPROVED'],
    REJECTED: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY', 'REJECTED'],
    RETURNED: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED'],
    WITHDRAWN: ['DRAFT', 'SUBMITTED', 'WITHDRAWN'],
  };
  const appRows: Prisma.ApplicationCreateManyInput[] = [];
  const appMeta: { id: string; status: string; chain: string[]; start: number; vt: typeof visaTypes[number]; customerId: string; branchId: string }[] = [];
  for (let i = 0; i < 49; i++) {
    const status = rng.weighted<string>([
      ['DRAFT', 5], ['SUBMITTED', 7], ['UNDER_REVIEW', 6], ['AT_EMBASSY', 5],
      ['ADDITIONAL_DOCS', 3], ['APPROVED', 13], ['REJECTED', 5], ['RETURNED', 3], ['WITHDRAWN', 2],
    ]);
    const customer = rng.pick(customers);
    const vt = rng.pick(visaTypes);
    const stalled = (status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'AT_EMBASSY' || status === 'ADDITIONAL_DOCS') && rng.chance(0.4);
    const start = stalled ? -rng.int(60, 130) : -rng.int(1, 50);
    const chain = APP_CHAIN[status];
    const id = uid();
    appRows.push({
      id, applicationNumber: num('application', 'APP'), branchId: customer.branchId,
      customerId: customer.id, visaTypeId: vt.id, status: status as any,
      applicantCount: rng.int(1, 4),
      submissionDate: chain.length > 1 ? day(start + 1) : null,
      decisionDate: status === 'APPROVED' || status === 'REJECTED' ? day(Math.min(start + chain.length * 5 + 10, -1)) : null,
      referenceNumber: status === 'APPROVED' ? `${vt.name.slice(0, 3).toUpperCase()}${rng.int(100000, 999999)}` : null,
      totalFees: money(rng.int(200, 2600), 'USD'), currencyCode: 'USD',
      notes: stalled ? 'Case awaiting embassy response beyond normal processing window.' : null,
      assignedToUserId: rng.pick(usersBy('VISA_OFFICER')).id,
      createdById: admin.id,
      createdAt: day(start),
    });
    appMeta.push({ id, status, chain, start, vt, customerId: customer.id, branchId: customer.branchId });
  }
  await prisma.application.createMany({ data: appRows });
  const logRows: Prisma.ApplicationStatusLogCreateManyInput[] = [];
  for (const a of appMeta) {
    a.chain.forEach((s, idx) => {
      logRows.push({
        id: uid(), applicationId: a.id,
        fromStatus: idx === 0 ? null : (a.chain[idx - 1] as any),
        toStatus: s as any,
        note: idx === 0 ? 'Application file created' : `Moved to ${s.replace(/_/g, ' ').toLowerCase()}`,
        changedByUserId: admin.id,
        createdAt: day(a.start + idx * 4),
      });
    });
  }
  await prisma.applicationStatusLog.createMany({ data: logRows });
  log(`Applications: ${appRows.length}, status logs: ${logRows.length}`);

  // ── Appointments ──────────────────────────────────────────────────────────
  const apptRows: Prisma.AppointmentCreateManyInput[] = [];
  for (let i = 0; i < 26; i++) {
    const a = appMeta[i % appMeta.length];
    const type = rng.weighted<any>([['BIOMETRICS', 6], ['INTERVIEW', 5], ['DOCUMENT_SUBMISSION', 5], ['MEDICAL', 3], ['COLLECTION', 3], ['OTHER', 2]]);
    const future = i < 12;
    const offset = future ? rng.int(1, 13) : -rng.int(2, 90);
    apptRows.push({
      id: uid(), branchId: a.branchId, type,
      status: (future ? rng.weighted<string>([['SCHEDULED', 9], ['CANCELLED', 2], ['RESCHEDULED', 1]]) : rng.weighted<string>([['COMPLETED', 8], ['MISSED', 2]])) as any,
      subject: `${type.replace(/_/g, ' ')} — ${a.vt.name}`,
      location: rng.pick(['VFS Global Dubai', 'VFS Global Karachi', 'Embassy of France Dubai', 'Royal Consulate Riyadh', 'Consulate General Istanbul']),
      scheduledAt: hour(offset, rng.int(8, 15)),
      durationMinutes: rng.pick([30, 45, 60]),
      applicationId: a.id, customerId: a.customerId,
      assignedToUserId: rng.pick(usersBy('VISA_OFFICER')).id, createdById: admin.id,
      rescheduleCount: rng.chance(0.15) ? 1 : 0,
    });
  }
  await prisma.appointment.createMany({ data: apptRows });
  log(`Appointments: ${apptRows.length}`);

  // ── Follow-ups ────────────────────────────────────────────────────────────
  const fuRows: Prisma.FollowUpCreateManyInput[] = [];
  for (let i = 0; i < 46; i++) {
    const customer = rng.pick(customers);
    const status = rng.weighted<string>([['PENDING', 16], ['COMPLETED', 22], ['MISSED', 5], ['CANCELLED', 3]]);
    // PENDING spread: some overdue, some today, mostly upcoming
    let offset: number;
    if (status === 'PENDING') offset = i % 5 === 0 ? -rng.int(1, 12) : (i % 7 === 0 ? 0 : rng.int(1, 20));
    else offset = -rng.int(1, 80);
    fuRows.push({
      id: uid(), branchId: customer.branchId,
      type: rng.pick(['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'VISIT', 'MEETING']) as any,
      subject: rng.pick(['Call back re document list', 'Confirm passport delivery', 'Quote follow-up', 'Visa decision update', 'Payment reminder', 'Renew interest check', 'File submission reminder']),
      notes: status === 'MISSED' ? 'Customer did not answer, retry tomorrow.' : null,
      scheduledAt: hour(offset, rng.int(9, 18)),
      completedAt: status === 'COMPLETED' ? hour(offset + 1, rng.int(9, 18)) : null,
      status: status as any,
      priority: rng.weighted<any>([['LOW', 3], ['MEDIUM', 6], ['HIGH', 3], ['URGENT', 1]]),
      customerId: customer.id,
      assignedToUserId: rng.pick(usersBy('SALES_AGENT')).id,
      createdById: admin.id,
    });
  }
  await prisma.followUp.createMany({ data: fuRows });
  log(`Follow-ups: ${fuRows.length}`);

  // ── Bookings + items (totals mirror server-side derivation) ───────────────
  const bookings: { id: string; branchId: string; total: number; paid: number; customerId: string; currency: string }[] = [];
  const bookingRows: Prisma.BookingCreateManyInput[] = [];
  const itemRows: Prisma.BookingItemCreateManyInput[] = [];
  for (let i = 0; i < 25; i++) {
    const customer = rng.pick(customers);
    const isHQ = customer.hq;
    const currency = branchCurrency(isHQ);
    const type = rng.weighted<any>([['FLIGHT', 5], ['HOTEL', 4], ['PACKAGE', 4], ['MIXED', 5], ['VISA', 3], ['TRANSFER', 2], ['TOUR', 2]]);
    const status = rng.weighted<any>([['CONFIRMED', 12], ['DRAFT', 4], ['COMPLETED', 6], ['CANCELLED', 3]]);
    const created = -rng.int(2, 150);
    const travel = (status === 'CONFIRMED' && i < 5) ? rng.int(2, 12) : rng.int(-60, 60);
    const nItems = rng.int(1, 4);
    let subtotal = 0;
    const lines: Prisma.BookingItemCreateManyInput[] = [];
    const push = (itemType: any, description: string, unit: number, qty: number) => {
      const unitPrice = money(unit, currency);
      const lineTotal = r2(unitPrice * qty);
      subtotal += lineTotal;
      lines.push({ id: uid(), bookingId: '', itemType, description, quantity: qty, unitPrice, lineTotal, currencyCode: currency });
    };
    if (type === 'PACKAGE') {
      const p = rng.pick(packages); push('PACKAGE', p.name, p.price, rng.int(1, 3));
    } else if (type === 'FLIGHT') {
      const f = rng.pick(flights); push('FLIGHT', `${f.airline} ${f.route}`, f.fare, rng.int(1, 4));
    } else if (type === 'HOTEL') {
      const h = rng.pick(hotels); push('HOTEL', `${h.name} — ${rng.int(2, 8)} nights`, h.rate, rng.int(2, 8));
    } else if (type === 'VISA') {
      const vt = rng.pick(visaTypes); push('VISA', `Visa service fee — ${vt.name}`, rng.int(80, 600), rng.int(1, 3));
    } else if (type === 'TRANSFER') {
      push('TRANSFER', rng.pick(['Airport pickup Dubai', 'Jeddah→Makkah transfer', 'Karachi city tour transport']), rng.int(30, 150), rng.int(1, 2));
    } else if (type === 'TOUR') {
      push('OTHER', rng.pick(['Desert safari', 'Bosphorus cruise', 'Petra day tour']), rng.int(50, 250), rng.int(1, 4));
    } else {
      const f = rng.pick(flights); const h = rng.pick(hotels);
      push('FLIGHT', `${f.airline} ${f.route}`, f.fare, rng.int(1, 2));
      push('HOTEL', `${h.name} — stay`, h.rate, rng.int(2, 6));
    }
    while (lines.length < nItems && rng.chance(0.5)) {
      push('SERVICE', rng.pick(['Document verification', 'Photostat & attestation', 'Priority handling']), rng.int(10, 60), rng.int(1, 2));
    }
    subtotal = r2(subtotal);
    const discount = r2(subtotal * rng.pick([0, 0, 0.02, 0.05]));
    const tax = r2(subtotal * rng.pick([0, 0.05, 0.05]));
    const total = r2(subtotal - discount + tax);
    const paid = status === 'CONFIRMED' ? r2(total * rng.pick([0.3, 0.5, 1, 1]))
      : status === 'COMPLETED' ? total : 0;
    const id = uid();
    bookingRows.push({
      id, bookingNumber: num('booking', 'BKG'), branchId: customer.branchId, type, status,
      customerId: customer.id, travelDate: day(travel), returnDate: day(travel + rng.int(3, 20)),
      paxCount: rng.int(1, 5), currencyCode: currency,
      subtotal, discount, tax, totalAmount: total, paidAmount: paid,
      paymentStatus: paid === 0 ? 'UNPAID' : paid >= total ? 'PAID' : 'PARTIAL',
      notes: status === 'CANCELLED' ? 'Customer cancelled — refunded per policy.' : null,
      assignedToUserId: rng.pick(usersBy('TRAVEL_AGENT')).id, createdById: admin.id,
      createdAt: day(created),
    });
    for (const l of lines) l.bookingId = id;
    itemRows.push(...lines);
    bookings.push({ id, branchId: customer.branchId, total, paid, customerId: customer.id, currency });
  }
  await prisma.booking.createMany({ data: bookingRows });
  await prisma.bookingItem.createMany({ data: itemRows });
  log(`Bookings: ${bookingRows.length}, items: ${itemRows.length}`);

  // ── Invoices + items + payments ───────────────────────────────────────────
  const invoices: { id: string; branchId: string; customerId: string; total: number; paid: number; currency: string; status: string; bookingId: string | null }[] = [];
  const invRows: Prisma.InvoiceCreateManyInput[] = [];
  const invItemRows: Prisma.InvoiceItemCreateManyInput[] = [];
  const payRows: Prisma.PaymentCreateManyInput[] = [];
  const statusPlan = [
    ...Array(8).fill('PAID'), ...Array(5).fill('PARTIALLY_PAID'),
    ...Array(5).fill('SENT'), ...Array(5).fill('OVERDUE'), ...Array(1).fill('CANCELLED'),
  ];
  for (let i = 0; i < 24; i++) {
    const customer = rng.pick(customers);
    const currency = branchCurrency(customer.hq);
    const status = statusPlan[i];
    const linked = rng.chance(0.5) ? rng.pick(bookings) : null;
    const issueOff = -rng.int(5, 120);
    const dueOff = issueOff + 21;
    const total = linked && customer.id === linked.customerId ? linked.total : money(rng.int(150, 4500), 'USD');
    let paid = 0;
    if (status === 'PAID') paid = total;
    else if (status === 'PARTIALLY_PAID') paid = r2(total * rng.pick([0.3, 0.4, 0.6, 0.75]));
    else if (status === 'OVERDUE' && rng.chance(0.4)) paid = r2(total * 0.25);
    else if (status === 'CANCELLED') paid = 0;
    const id = uid();
    invRows.push({
      id, invoiceNumber: num('invoice', 'INV'), branchId: customer.branchId, customerId: customer.id,
      bookingId: linked && customer.id === linked.customerId ? linked.id : null,
      status: status as any, issueDate: day(issueOff), dueDate: day(dueOff),
      currencyCode: currency,
      subtotal: total, discount: 0, tax: 0, totalAmount: total, paidAmount: paid,
      balanceDue: r2(total - paid),
      notes: status === 'CANCELLED' ? 'Cancelled after customer request.' : null,
      sentAt: status !== 'DRAFT' ? day(issueOff) : null,
      cancelledAt: status === 'CANCELLED' ? day(issueOff + 2) : null,
      createdById: admin.id, createdAt: day(issueOff),
    });
    const nLines = rng.int(1, 3);
    const each = r2(total / nLines);
    for (let l = 0; l < nLines; l++) {
      invItemRows.push({
        id: uid(), invoiceId: id,
        description: rng.pick(['Visa service fee', 'Embassy fees', 'Air ticket', 'Hotel stay', 'Package charges', 'Document handling']),
        quantity: 1, unitPrice: each, lineTotal: each,
      });
    }
    if (paid > 0) {
      const split = status === 'PAID' && rng.chance(0.4) ? 2 : 1;
      const part = r2(paid / split);
      for (let s = 0; s < split; s++) {
        payRows.push({
          id: uid(), paymentNumber: num('payment', 'PAY'), branchId: customer.branchId,
          invoiceId: id, customerId: customer.id,
          amount: s === split - 1 ? r2(paid - part * (split - 1)) : part,
          currencyCode: currency,
          method: rng.pick(['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE']) as any,
          status: 'COMPLETED', paidAt: day(Math.min(issueOff + 1 + s * 5, -1)),
          reference: `TXN${rng.int(100000, 999999)}`, isRefund: false, refundedAmount: 0,
          createdById: admin.id,
        });
      }
    }
    invoices.push({ id, branchId: customer.branchId, customerId: customer.id, total, paid, currency, status, bookingId: null });
  }
  await prisma.invoice.createMany({ data: invRows });
  await prisma.invoiceItem.createMany({ data: invItemRows });
  await prisma.payment.createMany({ data: payRows });
  log(`Invoices: ${invRows.length}, payments: ${payRows.length}`);

  // ── Quotations (incl. 2 converted → link back to invoices) ───────────────
  const qtRows: Prisma.QuotationCreateManyInput[] = [];
  const qtItemRows: Prisma.QuotationItemCreateManyInput[] = [];
  const qtPlan = [...Array(3).fill('DRAFT'), ...Array(5).fill('SENT'), ...Array(4).fill('ACCEPTED'), ...Array(1).fill('REJECTED'), ...Array(2).fill('EXPIRED')];
  for (let i = 0; i < qtPlan.length; i++) {
    const customer = rng.pick(customers);
    const currency = branchCurrency(customer.hq);
    const status = qtPlan[i];
    const created = -rng.int(3, 100);
    const total = money(rng.int(300, 6000), 'USD');
    const id = uid();
    qtRows.push({
      id, quotationNumber: num('quotation', 'QT'), branchId: customer.branchId, customerId: customer.id,
      status: status as any, validUntil: day(created + 15), currencyCode: currency,
      subtotal: total, discount: r2(total * 0.03), tax: r2(total * 0.05), totalAmount: r2(total * 1.02),
      notes: 'Includes service fee; embassy charges payable at submission.',
      sentAt: status === 'DRAFT' ? null : day(created + 1),
      acceptedAt: (status === 'ACCEPTED' || status === 'CONVERTED') ? day(created + 4) : null,
      createdById: admin.id, createdAt: day(created),
    });
    const n = rng.int(1, 3);
    const each = r2(total / n);
    for (let l = 0; l < n; l++) {
      qtItemRows.push({
        id: uid(), quotationId: id, itemType: rng.pick(['VISA', 'HOTEL', 'FLIGHT', 'SERVICE', 'PACKAGE']) as any,
        description: rng.pick(['Visa processing', 'Air ticket allocation', 'Hotel 5 nights', 'Insurance', 'Airport transfers']),
        quantity: 1, unitPrice: each, lineTotal: each,
      });
    }
  }
  await prisma.quotation.createMany({ data: qtRows });
  await prisma.quotationItem.createMany({ data: qtItemRows });
  // 2 converted quotations clone into fresh invoices
  for (const q of qtRows.slice(0, 2)) {
    const invId = uid();
    await prisma.invoice.create({
      data: {
        id: invId, invoiceNumber: num('invoice', 'INV'), branchId: q.branchId as string, customerId: q.customerId as string,
        status: 'SENT', currencyCode: q.currencyCode as string,
        subtotal: q.totalAmount as number, discount: 0, tax: 0, totalAmount: q.totalAmount as number,
        paidAmount: 0, balanceDue: q.totalAmount as number,
        issueDate: day(-1), dueDate: day(20), createdById: admin.id,
        items: { create: [{ id: uid(), description: 'Converted from quotation', quantity: 1, unitPrice: q.totalAmount as number, lineTotal: q.totalAmount as number }] },
      },
    });
    await prisma.quotation.update({ where: { id: q.id as string }, data: { status: 'CONVERTED', invoiceId: invId, convertedAt: day(-1) } });
  }
  log(`Quotations: ${qtRows.length} (2 converted)`);

  // ── One refund flow: refund a PAID invoice ────────────────────────────────
  const paidInv = invRows.find((x) => x.status === 'PAID')!;
  const origPay = payRows.find((p) => p.invoiceId === paidInv.id)!;
  const refundAmount = r2(Number(origPay.amount) * 0.5);
  await prisma.payment.create({
    data: {
      id: uid(), paymentNumber: num('payment', 'PAY'), branchId: paidInv.branchId as string,
      invoiceId: paidInv.id, customerId: paidInv.customerId, amount: refundAmount,
      currencyCode: paidInv.currencyCode, method: 'BANK_TRANSFER', status: 'COMPLETED',
      paidAt: day(-2), reference: `RFND${rng.int(10000, 99999)}`, isRefund: true, refundedAmount: 0,
      notes: 'Partial refund — embassy rejected one applicant.', createdById: admin.id,
    },
  });
  await prisma.payment.update({ where: { id: origPay.id as string }, data: { refundedAmount: refundAmount } });
  await prisma.invoice.update({
    where: { id: paidInv.id },
    data: { paidAmount: r2(Number(paidInv.paidAmount) - refundAmount), balanceDue: 0, status: 'REFUNDED' },
  });
  log('Refund flow seeded (1 refund payment)');

  // ── Expenses ──────────────────────────────────────────────────────────────
  const expRows: Prisma.ExpenseCreateManyInput[] = [];
  for (let i = 0; i < 20; i++) {
    const isHQ = rng.chance(0.65);
    const currency = isHQ ? rng.pick(['AED', 'USD']) : rng.pick(['PKR', 'AED']);
    const status = rng.weighted<any>([['APPROVED', 12], ['PENDING', 6], ['REJECTED', 2]]);
    expRows.push({
      id: uid(), expenseNumber: num('expense', 'EXP'), branchId: isHQ ? hq.id : khi.id,
      category: rng.pick(EXPENSE_CATEGORIES), title: rng.pick(['Monthly', 'Quarterly', 'Ad-hoc', 'One-time']) + ' expense',
      amount: money(rng.int(40, 900), currency),
      currencyCode: currency, expenseDate: day(-rng.int(1, 120)),
      status, paymentMethod: rng.pick(['CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE']) as any,
      description: 'Operational cost recorded by accounts.',
      approvedByUserId: status === 'APPROVED' ? admin.id : null,
      approvedAt: status === 'APPROVED' ? day(-rng.int(1, 90)) : null,
      createdById: admin.id,
    });
  }
  await prisma.expense.createMany({ data: expRows });
  log(`Expenses: ${expRows.length}`);

  // ── Commissions ───────────────────────────────────────────────────────────
  const comRows: Prisma.CommissionCreateManyInput[] = [];
  const comStatus = ['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'APPROVED', 'APPROVED', 'APPROVED', 'PAID', 'PAID', 'PAID', 'REJECTED'];
  for (let i = 0; i < 12; i++) {
    const b = bookings[i % bookings.length];
    const agent = rng.pick(agentRows);
    const pct = rng.chance(0.75);
    const base = Number(b.total);
    const rate = pct ? Number(rng.pick([3, 4, 5, 6, 7, 8])) : 0;
    const amount = pct ? r2(base * rate / 100) : money(rng.int(25, 150), b.currency);
    const status = comStatus[i];
    const createdOff = -rng.int(5, 130);
    comRows.push({
      id: uid(), commissionNumber: num('commission', 'COM'), branchId: b.branchId, agentId: agent.id,
      bookingId: b.id, type: pct ? 'PERCENTAGE' : 'FLAT', rate: pct ? rate : null,
      baseAmount: base, amount, currencyCode: b.currency, status: status as any,
      notes: status === 'REJECTED' ? 'Booking was cancelled; commission void.' : null,
      approvedByUserId: status === 'APPROVED' || status === 'PAID' ? admin.id : null,
      approvedAt: status === 'APPROVED' || status === 'PAID' ? day(createdOff + 3) : null,
      paidAt: status === 'PAID' ? day(createdOff + 7) : null,
      createdById: admin.id, createdAt: day(createdOff),
    });
  }
  await prisma.commission.createMany({ data: comRows });
  log(`Commissions: ${comRows.length}`);

  // ── Documents (+ placeholder files so download works) ────────────────────
  const uploadDocDir = path.resolve(__dirname, '..', '..', 'uploads', 'documents');
  fs.mkdirSync(uploadDocDir, { recursive: true });
  const samplePdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'latin1');
  const sampleFiles = [
    { key: 'seed-sample-1.pdf', bytes: samplePdf },
    { key: 'seed-sample-2.pdf', bytes: samplePdf },
    { key: 'seed-sample-3.pdf', bytes: samplePdf },
    { key: 'seed-sample-4.pdf', bytes: samplePdf },
  ];
  for (const f of sampleFiles) fs.writeFileSync(path.join(uploadDocDir, f.key), f.bytes);
  const docRows: Prisma.DocumentCreateManyInput[] = [];
  const docTypes = Object.keys(DOC_TITLES);
  const docsOfficer = usersBy('DOCUMENT_OFFICER')[0].id;
  for (let i = 0; i < 40; i++) {
    const t = rng.pick(docTypes);
    const status = rng.weighted<any>([['VERIFIED', 18], ['PENDING', 11], ['REJECTED', 6], ['EXPIRED', 5]]);
    const needsExpiry = t === 'PASSPORT' || t === 'BANK_STATEMENT' || t === 'INSURANCE' || t === 'CNIC';
    let expiry: Date | null = needsExpiry ? day(rng.int(60, 900)) : null;
    if (status === 'EXPIRED') expiry = day(-rng.int(2, 60));
    else if (i % 9 === 0) expiry = day(rng.int(3, 28)); // expiring soon → insights
    else if (i % 11 === 0) expiry = day(rng.int(45, 70));
    const sf = sampleFiles[i % sampleFiles.length];
    const customer = rng.pick(customers);
    const app = rng.chance(0.4) ? rng.pick(appMeta) : null;
    docRows.push({
      id: uid(), branchId: customer.branchId, type: t as any,
      title: rng.pick(DOC_TITLES[t]),
      fileName: `${t.toLowerCase()}-${i + 1}.pdf`, storageKey: `/uploads/documents/${sf.key}`,
      mimeType: 'application/pdf', sizeBytes: sf.bytes.length,
      status, expiryDate: expiry,
      customerId: customer.id, applicationId: app ? app.id : null,
      verifiedByUserId: status === 'VERIFIED' ? docsOfficer : null,
      verifiedAt: status === 'VERIFIED' ? day(-rng.int(1, 40)) : null,
      rejectReason: status === 'REJECTED' ? rng.pick(['Blurry scan', 'Expired document submitted', 'Wrong document type', 'Photo not meeting specs']) : null,
      uploadedByUserId: rng.pick([...usersBy('VISA_OFFICER'), ...usersBy('SALES_AGENT')]).id,
      createdAt: day(-rng.int(1, 150)),
    });
  }
  await prisma.document.createMany({ data: docRows });
  log(`Documents: ${docRows.length} (4 shared sample files)`);

  // ── Communications ────────────────────────────────────────────────────────
  const commRows: Prisma.CommunicationCreateManyInput[] = [];
  const COMM_TOPICS: [string, string][] = [
    ['Visa status enquiry', 'Customer asked where the application stands. Assured decision within processing window.'],
    ['Document checklist sent', 'Shared the checklist: passport, photos, bank statement, travel itinerary.'],
    ['Payment confirmation', 'Confirmed receipt of the service fee installment. Invoice updated.'],
    ['Embassy appointment scheduled', 'Biometrics slot confirmed at VFS. Instructed to bring originals.'],
    ['Refund request discussion', 'Customer requested partial refund after rejection. Explained policy, awaiting management approval.'],
    ['Umrah package options', 'Sent 3 package options with hotel distances from Haram. Customer considering family suite.'],
    ['Passport return', 'Passport delivered with visa sticker. Courier receipt shared.'],
    ['Renewal reminder', 'Reminder sent — passport expires under 6 months; renewal advised before travel.'],
  ];
  for (let i = 0; i < 60; i++) {
    const customer = rng.pick(customers);
    const [subject, body] = rng.pick(COMM_TOPICS);
    const inbound = rng.chance(0.4);
    commRows.push({
      id: uid(), branchId: customer.branchId,
      channel: rng.weighted<any>([['WHATSAPP', 10], ['CALL', 9], ['EMAIL', 6], ['SMS', 3], ['VISIT', 2], ['MEETING', 2]]),
      direction: inbound ? 'INBOUND' : 'OUTBOUND',
      subject, body,
      status: inbound ? (rng.chance(0.85) ? 'RECEIVED' : 'PENDING') : rng.weighted<any>([['SENT', 18], ['FAILED', 1]]),
      occurredAt: new Date(BASE - rng.int(0, 60 * 24 * 60) * 60000),
      customerId: customer.id,
      applicationId: rng.chance(0.3) ? rng.pick(appMeta).id : null,
      createdById: rng.pick(staff).id,
      createdAt: day(-rng.int(0, 60)),
    });
  }
  await prisma.communication.createMany({ data: commRows });
  log(`Communications: ${commRows.length}`);

  // ── Airports/airlines master data + agency fares ──────────────────────────
  const { importAirportsAndAirlines } = await import('./airports-import');
  await importAirportsAndAirlines(prisma);

  const FARE_ROUTES = [
    { airline: 'EK', flight: '602', from: 'DXB', to: 'KHI', base: [220, 320] },
    { airline: 'EK', flight: '605', from: 'KHI', to: 'DXB', base: [220, 320] },
    { airline: 'EY', flight: '605', from: 'AUH', to: 'KHI', base: [180, 260] },
    { airline: 'QR', flight: '871', from: 'DOH', to: 'LHR', base: [420, 640] },
    { airline: 'TK', flight: '767', from: 'IST', to: 'KHI', base: [300, 460] },
    { airline: 'FZ', flight: '717', from: 'DXB', to: 'MCT', base: [140, 220] },
    { airline: 'SV', flight: '121', from: 'JED', to: 'LHR', base: [380, 560] },
    { airline: 'SV', flight: '5906', from: 'DXB', to: 'JED', base: [180, 280] },
    { airline: 'PK', flight: '706', from: 'KHI', to: 'JED', base: [320, 480] },
    { airline: 'GA', flight: '836', from: 'KUL', to: 'DXB', base: [260, 380] },
    { airline: 'EK', flight: '348', from: 'DXB', to: 'JFK', base: [700, 1050] },
    { airline: 'QR', flight: '1007', from: 'DOH', to: 'BKK', base: [340, 520] },
  ];
  const neededCodes = [...new Set(FARE_ROUTES.map((r) => r.airline))];
  const neededAirports = [...new Set(FARE_ROUTES.flatMap((r) => [r.from, r.to]))];
  const airlineByCode = new Map((await prisma.airline.findMany({ where: { code: { in: neededCodes } } })).map((a) => [a.code, a]));
  const airportByIata = new Map((await prisma.airport.findMany({ where: { iataCode: { in: neededAirports } } })).map((a) => [a.iataCode, a]));
  const missing = neededAirports.filter((c) => !airportByIata.has(c));
  if (missing.length) log('WARNING: airports missing from import, routes skipped:', missing.join(', '));

  let fareCount = 0;
  for (const r of FARE_ROUTES) {
    const al = airlineByCode.get(r.airline);
    const from = airportByIata.get(r.from);
    const to = airportByIata.get(r.to);
    if (!al || !from || !to) continue;
    if (!al.defaultMarginType) {
      await prisma.airline.update({
        where: { id: al.id },
        data: { defaultMarginType: 'PERCENT', defaultMarginValue: String(rng.int(5, 12)) },
      });
    }
    for (let d = 1; d <= 13; d += 2) {
      const dep = new Date(BASE + d * DAY_MS);
      dep.setUTCHours(rng.int(1, 21), rng.pick([0, 15, 30, 45]), 0, 0);
      const cabin = rng.weighted<any>([['ECONOMY', 6], ['PREMIUM_ECONOMY', 2], ['BUSINESS', 2], ['FIRST', 1]]);
      const base = money(rng.int(r.base[0], r.base[1]) * (cabin === 'FIRST' ? 3 : cabin === 'BUSINESS' ? 2.1 : 1), 'USD');
      const explicitMargin = rng.chance(0.35);
      try {
        await prisma.flightFare.create({
          data: {
            airlineId: al.id,
            flightNumber: `${r.airline}${r.flight}`,
            originAirportId: from.id,
            destinationAirportId: to.id,
            departureTime: dep,
            arrivalTime: new Date(dep.getTime() + rng.int(2, 9) * 3600000),
            cabinClass: cabin,
            baseFare: base,
            currencyCode: 'USD',
            marginType: explicitMargin ? 'PERCENT' : null,
            marginValue: explicitMargin ? String(rng.int(4, 18)) : null,
            taxPercent: rng.chance(0.5) ? String(rng.int(0, 15)) : '0',
            seatsTotal: rng.chance(0.4) ? rng.int(4, 30) : 0,
            isActive: true,
          },
        });
        fareCount++;
      } catch { /* duplicate deterministic row */ }
    }
  }
  log(`Agency fares: ${fareCount}`);

  // ── Sequence sync (critical: live inserts must not 409) ──────────────────
  for (const [entity, value] of Object.entries(counters)) {
    await prisma.sequence.updateMany({ where: { entity }, data: { currentValue: value } });
  }
  log('Sequences synced:', JSON.stringify(counters));

  return { branchKhiId: khi.id, staffCount: staff.length, counters };
}
