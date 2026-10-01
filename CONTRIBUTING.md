# Contributing

Thanks for helping improve the Travel & Visa Agency ERP. This guide covers setup, the project's hard-won conventions, and how we verify changes.

## Development setup

```bash
git clone https://github.com/Irfan-CodeSynth/TRAVEL-VISA-AGENCY-ERP.git
cd TRAVEL-VISA-AGENCY-ERP
npm install
cp .env.example .env        # then edit real values: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm run db:up               # embedded Postgres on :5433 (or point DATABASE_URL at your own)
npm run db:push             # push Prisma schema (no migrations folder — db:push is the workflow)
npm run db:seed:full        # rich deterministic demo dataset
npm run dev                 # API :4000/api/v1, client :5173
```

The seed creates staff logins across roles (password `Staff@123456`) so you can exercise permission-based views: `sara.admin` (ADMIN), `zara.travel` (TRAVEL_AGENT), `sana.sales` (SALES_AGENT), `junaid.accounts` (ACCOUNTANT).

## Path caveat (Windows)

If your checkout path contains `&` or spaces, npm lifecycle scripts can break. Either clone into a clean path, or invoke tools directly with node:

```bash
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
node node_modules/tsx/dist/cli.mjs <file>
```

Prisma run from `server/` won't auto-load the repo-root `.env`; export the URL first:

```bash
export DATABASE_URL=$(grep -m1 '^DATABASE_URL' .env | cut -d'"' -f2)
```

## Project conventions (please keep these)

- **Never trust the client for money.** Selling prices, line totals, and booking totals are always computed server-side. The client may *preview* a price, but the server recomputes it.
- **Margin chain.** Fare margin → airline default → global setting (`flights/defaultMargin`). Mirror this chain exactly in the client preview (`client/src/features/travel/fares/constants.ts`).
- **Permission-based visibility.** Base fare + margin are visible only to fare managers (`flights.create`/`flights.edit`); view-only counter staff see just the selling price. Keep server (`canSeeMargin`) and client (`useCanSeeMargin`) in sync.
- **Seat integrity.** Selling a fare decrements seats inside a transaction with an oversell guard; cancelling a booking restores seats. Don't bypass this.
- **Schema changes** use `prisma db push`; there is no committed migrations folder.
- **Prisma `Decimal` serializes as a string** in JSON — wrap with `Number()` on the client.

## Verifying your change

Run the checks that cover what you touched:

```bash
node scripts/fare-verify.mjs     # 21 E2E checks for the fare/ticket subsystem
powershell scripts/api-smoke.ps1 # full API smoke suite (99 checks)
```

For UI changes, exercise the golden path in a real browser as both a fare manager and view-only staff.

Then confirm both builds pass:

```bash
npm run build   # server tsc + client tsc + vite build
```

## Workflow

1. Branch off `main`, keep changes focused.
2. Fill in the PR template — note the module(s) touched and any permission impact.
3. Keep secrets out of git. `.env` is gitignored; never commit credentials, tokens, or uploaded files.
4. A PR is merge-ready when typecheck, build, and the relevant verification scripts pass.

## Reporting issues

Use the issue templates. Include the module, reproduction steps, and the API response for data issues.
