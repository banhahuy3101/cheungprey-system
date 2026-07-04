# Cheung Prey System — Documentation

Finance Management System (FMS) documentation for the **Cheung Prey District Management System** (ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ).

## Documents

| Document | Description |
|----------|-------------|
| [Business Requirements](./business-requirements.md) | FMS blueprint: single-tenant zone-scoped ledger, RBAC, budgets, income/expense, immutability, FMIS readiness |
| [Finance Module Technical Notes](./finance-module-roadmap.md) | Schema designs, migration phases, API routes, budget ceiling enforcement |

## System overview

- **Architecture:** Single-tenant with zone-scoped Row-Level Security (RLS)
- **Frontend:** React (Vite), Khmer UI
- **Backend:** Go REST API, Supabase (auth + PostgreSQL)
- **Access control:** Role-based permissions (Super Admin → District Admin → Commune Chief → Commune Clerk)
- **Ledger:** Double-entry bookkeeping, immutable audit trail, no hard deletes

For setup and run instructions, see [backend/README.md](../backend/README.md).
