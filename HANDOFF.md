# CoopLedger — Session Handoff

> Read this first, then `project-brief.md`. This file gives you the context and decisions from the planning session; `project-brief.md` is the executable spec you build against.

## Status (2026-11-03)

Implemented and verified locally. The fullstack MVP is done — backend (Spring
Boot 3.5 + Flyway + JWT/RBAC) and frontend (Angular 20, role-based screens).
See the [README](README.md) for running it. Future work continues on the
`develop` branch.

## What this is

**CoopLedger** — a fullstack savings-and-loan cooperative (koperasi simpan pinjam) system. It is a real, sellable portfolio project to demonstrate **Angular + Java Spring Boot** for a banking / software-house placement.

## Decisions locked this session (do not re-litigate)

- **Name:** CoopLedger. Tagline: *"Every member's share, in one ledger."* (Rejected: AndilKop, ShareLedger — taken, CoopCore — taken, KopKu/Kopra/Sikop — taken in the Indonesian market.)
- **Stack:** Angular 20 (standalone + Signals + Reactive Forms) + Java 21 + Spring Boot 3.5 (Maven) + PostgreSQL. **Monolith.** No microservices, no Kafka, no rules engine.
- **Why this stack:** a transactional, multi-role financial domain — Angular's typed reactive forms + role-based dashboards on the UI; Spring Boot's `@Transactional`, Spring Security RBAC, `@Scheduled`, JPA + Flyway on the server.
- **MVP scope:** 4 screens + 1 core flow, ±1 week. Everything out of scope goes to the roadmap (double-entry ledger, idempotency, locking, Testcontainers, CI badge).
- **Free hosting (verified current):** Cloudflare Pages (FE — unlimited, commercial OK) → Render Free (BE — no card, via `render.yaml`) → Neon Postgres (DB — no card, use the `-pooler` URL). **Do NOT use Vercel** (free tier is non-commercial) or **Render Postgres** (expires after 30 days).

## Your job

Execute `project-brief.md` end to end, in the order in section 11 of that file:

scaffold monorepo → backend (entities, Flyway migrations, JWT/RBAC, savings/loan/installment endpoints, simple SHU, tests) → frontend (auth + 4 screens + route guards + JWT interceptor) → `docker compose up` local run → `render.yaml` + `_redirects` + README.

## Working agreements

- **Language:** code, commits, and docs in English. Product UI labels may be Indonesian (the product is sold to Indonesian koperasi) — decide per screen, but keep code identifiers English.
- **Money = `BigDecimal`** (never float/double). **Migrations = Flyway** (never `ddl-auto=update`). **Auth = enforced RBAC** (401/403, not just UI).
- **Be lazy / don't over-engineer.** Monolith. No speculative abstractions. Ship the smallest correct thing the brief asks for.
- Leave at least one runnable test for non-trivial logic (the brief requires a financial-invariant test + an RBAC test).

## Manual steps for the human (you must hand off, you cannot do these)

The AI session cannot create accounts, connect repos, or hold production secrets. When you reach the deploy step, hand off to the human:

1. Create GitHub repo + accounts (Cloudflare, Render, Neon).
2. Connect repos, generate and set secrets (`JWT_SECRET`, `DATABASE_URL`).

Full checklist in `project-brief.md` section 10.A.

## Immediate next step

Scaffold the monorepo (structure in `project-brief.md` section 12) and start the backend.
