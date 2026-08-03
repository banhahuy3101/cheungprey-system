# Cheung Prey System — Documentation

Cheung Prey District Management System (ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ).

## Documents

| Document | Description |
|----------|-------------|
| [Business Requirements](./business-requirements.md) | Comprehensive BRD (v3.0): all 12 modules — auth, geographic hierarchy, party members, voters, files, records, report documents/templates, performance management, FMS (CoA, budgets, transactions, approval workflow, immutability, audit, dashboard), user/role admin, PDF generation, security |
| [Finance Module Technical Notes](./finance-module-roadmap.md) | FMS schema designs, migration phases, API routes, budget ceiling enforcement |

## System overview

- **Architecture:** Single-tenant with zone-scoped Row-Level Security (RLS)
- **Frontend:** React 19 (Vite 8), Khmer UI, TipTap rich text editor
- **Backend:** Go 1.26 REST API (Gin), Supabase (Auth + PostgreSQL + Storage)
- **PDF:** Headless Chrome/Chromedp with Khmer Unicode font support
- **Access control:** 8-role RBAC with 12 feature flags, multi-role support, merged permissions
- **Ledger:** Double-entry bookkeeping, immutable audit trail, reversal entries only
- **Deployment:** Render (Docker) + AWS ECS Fargate

For setup and run instructions, see [backend/README.md](../backend/README.md).
