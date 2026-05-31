# Archived Product Docs

Documents in this folder are **historical references only**. They are kept for
provenance but are **no longer authoritative**. They may contradict current
product decisions, pricing, or architecture.

**Source of truth for active product specs is the Notion "Being. Product Backlog"
database** (work items: `FEAT-*`, `MAINT-*`, etc.). When an archived doc disagrees
with Notion, Notion wins.

## Why a doc lands here

A spec is archived (not deleted) when it has been superseded but still has
historical value — e.g. it documents an earlier design that informed the current
one, or it records decisions worth tracing later. Use `git log --follow <file>`
to see its full history across the move.

## Index

| Archived doc | Original location | Archived | Superseded by | Why archived |
|---|---|---|---|---|
| `FEAT-16-Account-Subscription-UX-Specifications-2025-12.md` | `docs/product/FEAT-16-Account-Subscription-UX-Specifications.md` | MAINT-170 (2026-05) | Notion FEAT-16 / FEAT-16a planning | Stale (v1.0, 2025-12-23). Superseded by current Notion FEAT-16: the doc's pricing ($12.99/mo) is outdated and the live figure is not settled here — defer to Notion, do not treat any number in the doc as current; its HIPAA framing contradicts the current BAA-free architecture; and the UX flow is being redone during FEAT-16a planning. |
