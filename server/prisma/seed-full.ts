/* eslint-disable @typescript-eslint/no-explicit-any */
// db:seed:full — wipes business data and loads the deterministic demo graph.
// Baseline seed (seed.ts) must run first (company/HQ/roles/currencies/sequences/countries).
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { seedDataset, STAFF_DEFS } from './seed-data/dataset';

const prisma = new PrismaClient();

async function resetBusinessData() {
  const staffIds = (await prisma.user.findMany({ where: { email: { in: STAFF_DEFS.map((s) => s.email) } }, select: { id: true } })).map((u) => u.id);

  await prisma.communication.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.bookingItem.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.followUp.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.applicationStatusLog.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.flight.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.visaType.deleteMany({});
  // Flight fares reference bookingItem.fareId, so delete only after booking items are gone.
  await prisma.flightFare.deleteMany({});
  await prisma.airline.deleteMany({});
  await prisma.airport.deleteMany({});

  if (staffIds.length) {
    await prisma.userSession.deleteMany({ where: { userId: { in: staffIds } } });
    await prisma.loginHistory.deleteMany({ where: { userId: { in: staffIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: staffIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staffIds } } });
  }
  const khi = await prisma.branch.findUnique({ where: { code: 'KHI' } });
  if (khi) {
    // Any leftover references (audit etc.) are SetNull-safe; branch itself only used by seeded rows now.
    await prisma.branch.delete({ where: { id: khi.id } });
  }

  for (const entity of ['customer', 'lead', 'application', 'booking', 'quotation', 'invoice', 'payment', 'expense', 'commission', 'appointment']) {
    await prisma.sequence.updateMany({ where: { entity }, data: { currentValue: 0 } });
  }

  // Remove seeded placeholder files
  const dir = path.resolve(__dirname, '..', 'uploads', 'documents');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('seed-sample-')) fs.rmSync(path.join(dir, f));
    }
  }
  console.log(`Reset done (staff users removed: ${staffIds.length})`);
}

async function main() {
  console.log('🌱 FULL SEED — reset');
  await resetBusinessData();
  console.log('🌱 FULL SEED — dataset (mulberry32 seed 42)');
  const t0 = Date.now();
  const result = await seedDataset(prisma);
  console.log(`✅ Full seed complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(result));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
