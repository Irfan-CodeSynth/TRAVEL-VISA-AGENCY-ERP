## What does this PR do?

<!-- Summary of the change and the motivation behind it. -->

## Affected module(s)

- [ ] CRM
- [ ] Visa
- [ ] Travel
- [ ] Agency Fares / Ticket Counter
- [ ] Finance
- [ ] Partners / Team
- [ ] Documents / Communications
- [ ] Reports / Dashboard
- [ ] Infra / shared

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Schema / migration
- [ ] Docs

## How to test

<!-- Commands and manual steps. Note: run tools directly with node if your path contains '&' or spaces. -->

```bash
npm run db:push
npm run dev
```

- [ ] `node scripts/fare-verify.mjs` passes (if fare subsystem touched)
- [ ] `scripts/api-smoke.ps1` passes (if API touched)

## Checklist

- [ ] Selling prices / booking totals remain server-computed (never trusted from the client).
- [ ] Permission-based visibility respected (e.g. base fare + margin hidden from view-only staff).
- [ ] No secrets committed — `.env` stays gitignored.
- [ ] Server + client typecheck pass; production build passes.
- [ ] UI verified in a browser for frontend changes.

## Notes / risks

<!-- Anything reviewers should know: breaking changes, data backfill, follow-ups. -->
