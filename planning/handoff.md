# Handoff — 2026-10-16

Session: 90cdd395-5a36-4b36-b323-f77a08e20f24 — resume with `claude --resume 90cdd395-5a36-4b36-b323-f77a08e20f24` from this repo's root.

Point-in-time note, not a source of truth. `planning/roadmap.md` owns order, status and
stage; each spec's `tasks.md` owns the work; `.specloop/interview.md` owns the interview
ledger. Branch: `master` (renaming to `main` is 001 T002). No commits yet: every file below
is untracked.

## Done this session

- `specloop:start` interview (Phases A–D) complete → `AGENTS.md`, `CLAUDE.md`, `planning/product.md`, `planning/architecture.md`, `planning/styles.md`, `.specloop/loop.config.json` (claude, `-p`, language `es`).
- Roadmap seeded: 16 specs (001–011 = MVP/phase 1, 012–016 = later), Priority = row order.
- User chose `specloop:advance` drafting over per-spec Q&A. All 16 `requirements.md` drafted and approved one by one.
- 001 `project-setup` and 002 `supabase-tooling`: design + tasks closed → `tasks_ready`. Decisions appended to `planning/architecture.md` and `AGENTS.md`.
- Live escape-hatch answers: 003 multiple sheets per week allowed; 016 evaluation = nutritionist's goals in Settings, general references as fallback.

## Next

1. Human tasks of 001 (T001 create GitHub repo + remote) and 002 (T001–T002 Supabase access token + DB password as Windows user env vars; T008 authenticate MCP in `/mcp`): they unblock the agent tasks.
2. `specloop:loop-setup`, then `specloop:loop` to run 001 and 002 (Priority 1–2, no deps).
3. When 001 is done: `specloop:advance` closes design/tasks for 005. When 001 + 002 are done: 003. And so on down the `Depends on` chain (003 → 004 → 006 → 007/009 → …).

## Open / skipped

- `brand-refs`: skipped. User: "ninguna en concreto".
- Type scale: TBD (`planning/styles.md`). Not asked; pick in a design pass.
- Roadmap gap: 012 and 014 also need 010 + 011, and 015 also needs 009, 010, 014; their `Depends on` cells list only 009 / 012. Fix with `specloop:amend` or `specloop:start`.
- Every `_(judgement, no standard)_` / unverified line in the 001–016 `requirements.md` files is an agent call the user approved but didn't originate. The list is in the advance report; worth a skim before each spec's design.

## Traps

- Supabase `sb_secret_…` key was pasted into the chat: the user was told to rotate it. It is not in any file; keep it that way.
- Agent rule: never delete real Supabase data. The MCP is read-only by design (002); schema writes only via `supabase db push`.
- HARD style rules: sage/cream palette only, no popups/modals, no off-palette colors. Do not re-litigate them.
- The user explicitly chose: no Python backend, no Google OAuth (access code once per device), CI non-blocking, no Playwright, no Sentry.
- Week 1 = Monday 2026-10-19. Several sheets per week are allowed.

## Not verified — don't claim otherwise

- Nothing has been built or run. No code exists.
- Supabase project `jojumjyqxpqzaslbxrso` was only seen as a pasted dashboard; CLI link and MCP are untested.
- Several "standard" citations are secondary sources (marked in each `requirements.md`).
