# NovaTrade

TradingView-style demo platform with three independent applications sharing PostgreSQL. This is not
a configured monorepo: each app has its own dependencies, scripts and environment.

## Applications

| Directory | Stack | Default port | Purpose |
|---|---|---:|---|
| `backend/` | NestJS 11, Prisma, Socket.IO | 3001 | auth, market data, trading, wallet, KYC, support |
| `frontend/` | Next.js 15, React 19 | 3000 | user trading terminal |
| `admin/` | Next.js 14, React 18, Prisma | 3002 | privileged operations and audit trail |

The apps share one PostgreSQL database but use separate auth secrets. Never reuse the user JWT secret
for admin auth.

## Local setup

1. Create local env files from the checked-in `.env.example` files. Never copy production values.
2. Start PostgreSQL and apply the appropriate Prisma migrations/generation for backend and admin.
3. Install and run each app in its own terminal:

```bash
cd backend
npm install
npm run start:dev

cd ../frontend
npm install
npm run dev

cd ../admin
npm install
npm run dev
```

## Verification

```bash
cd backend
npm test
npm run build

cd ../frontend
npm run build

cd ../admin
npm run check:parity
npm run build
```

Current architecture and known risks are mapped in
`../../Obsidian/Workbench/Code/NovaTrade-Code-Map.md`. This nested repo contains active dirty work;
verify `git status` before edits. Production deployment and credential rotation require Roman's
approval.
