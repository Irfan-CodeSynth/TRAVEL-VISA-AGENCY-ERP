import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const validIata = (s: string) => /^[A-Z]{3}$/.test(s);
const validCode = (s: string) => /^[A-Z0-9]{2}$/.test(s) && s !== 'NA';

export async function importAirportsAndAirlines(prisma: PrismaClient) {
  const dir = path.join(__dirname, 'csv');
  const airportsFile = path.join(dir, 'airports.dat');
  const airlinesFile = path.join(dir, 'airlines.dat');
  if (!fs.existsSync(airportsFile) || !fs.existsSync(airlinesFile)) {
    console.warn('OpenFlights CSVs not found in prisma/seed-data/csv — skipping airport/airline import');
    return { airports: 0, airlines: 0 };
  }

  const airportByCode = new Map<string, { iataCode: string; name: string; city: string | null; country: string | null }>();
  for (const line of fs.readFileSync(airportsFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const c = splitCsvLine(line);
    const [, name, city, country, iata, , , , , , , , type] = c;
    if (type && type !== 'airport') continue;
    if (!validIata(iata ?? '') || airportByCode.has(iata)) continue;
    airportByCode.set(iata, { iataCode: iata, name: (name || iata).trim(), city: city?.trim() || null, country: country?.trim() || null });
  }

  const airlineByCode = new Map<string, { code: string; name: string; country: string | null }>();
  for (const line of fs.readFileSync(airlinesFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const c = splitCsvLine(line);
    const [, name, , iata, icao, , country, active] = c;
    if (active && active !== 'Y') continue;
    if (!name || name === 'Unknown' || name === 'N/A') continue;
    const code = validCode(iata ?? '') ? iata : validIata(icao ?? '') || /^[A-Z]{3}$/.test(icao ?? '') ? icao : null;
    if (!code || airlineByCode.has(code)) continue;
    airlineByCode.set(code, { code, name: name.trim(), country: country?.trim() || null });
  }

  const airports = [...airportByCode.values()];
  const airlines = [...airlineByCode.values()];
  for (let i = 0; i < airports.length; i += 1000) {
    await prisma.airport.createMany({ data: airports.slice(i, i + 1000), skipDuplicates: true });
  }
  for (let i = 0; i < airlines.length; i += 1000) {
    await prisma.airline.createMany({ data: airlines.slice(i, i + 1000), skipDuplicates: true });
  }
  console.log(`Airports imported: ${airports.length}, airlines imported: ${airlines.length}`);
  return { airports: airports.length, airlines: airlines.length };
}
