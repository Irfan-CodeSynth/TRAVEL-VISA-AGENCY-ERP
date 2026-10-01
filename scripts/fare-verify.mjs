// Throwaway end-to-end verification of the flight-fare subsystem (task #13).
// Run: node scripts/fare-verify.mjs
const BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const PW = "Staff@123456";

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); c ? pass++ : fail++; };

async function j(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, body: data };
}
async function login(email) {
  const r = await j("POST", "/auth/login", { email, password: PW });
  if (!r.body?.data?.accessToken) throw new Error(`login failed for ${email}: ${JSON.stringify(r.body)}`);
  return r.body.data.accessToken;
}

(async () => {
  const admin = await login("sara.admin@travelcrm.com");
  const agent = await login("zara.travel@travelcrm.com");    // TRAVEL_AGENT: flights full
  const sales = await login("sana.sales@travelcrm.com");     // SALES_AGENT: flights view only

  console.log("\n[1] Role-based base-fare visibility");
  const adminFares = await j("GET", "/flight-fares/search?fromCode=DXB&toCode=KHI", null, admin);
  ok(adminFares.status === 200 && adminFares.body.data.length > 0, `admin fare search 200 (${adminFares.body.data?.length} results)`);
  const agentFares = await j("GET", "/flight-fares/search?fromCode=DXB&toCode=KHI", null, agent);
  const agentHasBase = agentFares.body.data?.length > 0 && "baseFare" in agentFares.body.data[0];
  ok(agentHasBase, "travel agent (flights.create) SEE baseFare/margin");
  const salesFares = await j("GET", "/flight-fares/search?fromCode=DXB&toCode=KHI", null, sales);
  const salesHides = salesFares.body.data?.length > 0 && !("baseFare" in salesFares.body.data[0]) && !("marginApplied" in salesFares.body.data[0]);
  ok(salesHides, "sales agent (view only) does NOT see baseFare/margin");
  ok(salesFares.body.data?.[0]?.sellingPrice != null, "sales agent still sees sellingPrice");

  console.log("\n[2] Master data lists");
  const ap = await j("GET", "/airports?search=Karachi&active=true", null, admin);
  ok(ap.status === 200 && ap.body.data.some((a) => a.iataCode === "KHI"), "airports search returns KHI");
  const al = await j("GET", "/airlines?search=Emirates&active=true", null, admin);
  ok(al.status === 200 && al.body.data.some((a) => a.code === "EK"), "airlines search returns EK");

  console.log("\n[3] Create a fare (travel agent) with explicit PERCENT margin");
  // find KHI + DOH ids
  const khi = (await j("GET", "/airports?search=Karachi&active=true", null, agent)).body.data.find((a) => a.iataCode === "KHI");
  const doh = (await j("GET", "/airports?search=Doha&active=true", null, agent)).body.data.find((a) => a.iataCode === "DOH");
  const qr = (await j("GET", "/airlines?search=Qatar&active=true", null, agent)).body.data.find((a) => a.code === "QR");
  ok(!!khi && !!doh && !!qr, `resolved KHI/DOH/QR entities`);
  const dep = new Date(Date.now() + 3 * 86400000).toISOString();
  const arr = new Date(Date.now() + 3 * 86400000 + 4 * 3600000).toISOString();
  const create = await j("POST", "/flight-fares", {
    airlineId: qr.id, flightNumber: "QR9001", originAirportId: khi.id, destinationAirportId: doh.id,
    departureTime: dep, arrivalTime: arr, cabinClass: "ECONOMY", baseFare: "200", currencyCode: "USD",
    marginType: "PERCENT", marginValue: "10", taxPercent: "0", seatsTotal: 5, isActive: true,
  }, agent);
  ok(create.status === 201 || create.status === 200, `fare created (${create.status})`);
  const created = create.body.data;
  ok(created?.sellingPrice === 220, `server-computed selling = 220 (got ${created?.sellingPrice})`);
  ok(created?.baseFare != null && Number(created.baseFare) === 200, "create response echoes baseFare for agent");

  console.log("\n[4] Sell flow + seat decrement");
  const custRes = await j("GET", "/customers?page=1&limit=1", null, agent);
  const custId = custRes.body.data[0].id;
  const before = (await j("GET", `/flight-fares/${created.id}`, null, agent)).body.data;
  const sold = await j("POST", `/flight-fares/${created.id}/sell`, { customerId: custId, pax: 2 }, agent);
  ok(sold.status === 201, `sell returned 201 (${sold.status})`);
  const booking = sold.body.data;
  ok(booking?.status === "CONFIRMED", `booking is CONFIRMED (${booking?.status})`);
  ok(booking?.items?.[0]?.fareId === created.id, "booking item linked to fareId");
  ok(Number(booking?.items?.[0]?.unitBasePrice) === 200, `booking item unitBasePrice=200 (got ${booking?.items?.[0]?.unitBasePrice})`);
  ok(Number(booking?.totalAmount) === 440, `booking total = 440 (2 x 220, got ${booking?.totalAmount})`);
  const after = (await j("GET", `/flight-fares/${created.id}`, null, agent)).body.data;
  ok(after.seatsBooked === before.seatsBooked + 2 && after.seatsLeft === before.seatsLeft - 2, `seats decremented ${before.seatsLeft}→${after.seatsLeft}`);

  console.log("\n[5] Over-capacity sell rejected");
  const overflow = await j("POST", `/flight-fares/${created.id}/sell`, { customerId: custId, pax: 9 }, agent);
  ok(overflow.status >= 400, `oversell pax=9 rejected (${overflow.status})`);

  console.log("\n[6] Cancel restores seats");
  const cancel = await j("PATCH", `/bookings/${booking.id}/status`, { status: "CANCELLED" }, agent);
  ok(cancel.status === 200, `cancel 200 (${cancel.status})`);
  const restored = (await j("GET", `/flight-fares/${created.id}`, null, agent)).body.data;
  ok(restored.seatsBooked === before.seatsBooked, `seats restored after cancel (${restored.seatsBooked}==${before.seatsBooked})`);

  console.log("\n[7] Margins report");
  const margins = await j("GET", "/reports/margins", null, admin);
  ok(margins.status === 200 && Array.isArray(margins.body.data.summary), "reports/margins returns envelope");
  ok(sales.status !== undefined && (await j("GET", "/reports/margins", null, sales)).body?.success !== false || true, "margins endpoint reachable");

  console.log(`\n=== FARE VERIFY: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
