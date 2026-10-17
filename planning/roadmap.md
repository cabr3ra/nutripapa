# Roadmap

Index of every spec — status, dependencies, pipeline stage, and priority. Read this
table first; nothing else in this repo should be needed to get oriented.

| ID  | Plan | Status | Depends on | Stage | Priority |
|-----|------|--------|------------|-------|----------|
| 001 | project-setup | done | — | — | 1 |
| 002 | supabase-tooling | done | — | — | 2 |
| 003 | database-schema | done | 001, 002 | — | 3 |
| 004 | access-code | done | 003 | — | 4 |
| 005 | cloudflare-deploy | blocked | 001 | looping | 5 |
| 006 | weekly-table | done | 004 | — | 6 |
| 007 | meal-entry | done | 006 | — | 7 |
| 008 | drag-and-drop | done | 007 | — | 8 |
| 009 | daily-tracking | done | 006 | — | 9 |
| 010 | offline-sync | todo | 007, 009 | tasks_ready | 10 |
| 011 | pdf-export | todo | 006, 009 | tasks_ready | 11 |
| 012 | weight-tracking | todo | 009 | requirements | 12 |
| 013 | image-export | todo | 011 | requirements | 13 |
| 014 | steps-km | todo | 009 | requirements | 14 |
| 015 | stats-dashboard | todo | 012 | requirements | 15 |
| 016 | progress-evaluation | todo | 015 | requirements | 16 |

`Status`: `todo` · `in_progress` · `blocked` · `done` (a stopped spec stays
`in_progress`; `interrupted` is a task state only). Written only by
`specloop:loop` after the row is created — never hand-edit it.

`Stage`: `requirements` · `design_closed` · `tasks_ready` · `looping` — which skill
a spec needs next. `—` until this skill finishes that spec's `requirements.md`.

`Priority`: a live ordering number — lower runs first among specs `Depends on`
doesn't already order. `—` if unranked.
