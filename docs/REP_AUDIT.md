# REP Audit (2026-10-01)

Audit requested before building a new "REP core engine" package. **Stopping after this step per the task's own instruction** — see Bottom Line.

## 1. Storage — `prisma/schema.prisma`, `model User` (starts line 182)

| Field | Line | Type | Default | Notes |
|---|---|---|---|---|
| `level` | 224 | `Int` | `1` | 1–6, gated by `LEVELS_UI_ENABLED` for display |
| `reputation` | 225 | `Decimal @db.Decimal(3,2)` | `0` | 0.00–5.00 peer-review star average. **Independent of REP** since the 2026-07-05 migration (ADR-0015). Feeds `checkLevelUp`'s level thresholds, not the REP ledger. |
| `rep` | 226 | `Int` | `0` | **This is "REP."** Schema comment: a discrete point ledger — sum of `RepHistory.delta`. |
| `trustScore` | 227 (`@map("trust_score")`) | `Int` | `100` | Separate metric, moved by `lib/rating/referral-lifecycle.ts`, not by `awardRep`. |
| `currentStreak` / `longestStreak` | 232–233 | `Int` | `0` | Daily-login streak counters that drive REP bonuses |
| `lastLoginDate` | 234 | `DateTime?` | — | Date-only touchpoint for streak math |

Relation: `repHistory RepHistory[]` at line 269.

**`User.rep` is already the REP field, explicitly documented as a cached sum of an existing ledger table (`RepHistory`), not a standalone counter.**

## 2. The ledger table already exists — `RepHistory` (schema line 617)

```prisma
// Renamed from RatingHistory (pre-2026-07-05) — same ledger, now backing
// REP directly (User.rep = sum of delta) rather than logging a derived
// weighted-formula score. See ADR-0015.
model RepHistory {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  delta     Int                                  // +/- REP amount
  reason    String?
  source    String?                              // which code path/event
  createdAt DateTime @default(now()) @map("created_at")
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("rep_history")
}
```

This **is** an append-only ledger backing `User.rep`, and is what DECISIONS.md/CLAUDE.md's "REP-история" references.

## 3. Writers — all funnel through one function, `lib/rating/rep-engine.ts`

Exports `REP_TABLE` (point table, `wired: true/false` per entry) and:

- **`awardRep(userId, points, reason, source)`** (line 75) — single choke point. `prisma.$transaction` of `user.update({ rep: increment })`, `repHistory.create`, `analyticsEvent.create({ type: "rep.granted" })` — all three or none.
- **`awardRepWithDailyCap(...)`** (line 93) — wraps `awardRep` with a per-`source`-per-UTC-day cap.
- **`touchDailyLogin(userId)`** (line 123) — daily login (+5), 7-day streak (+50), 30-day streak (+300).
- **`checkProfileCompleteBonus(userId)`** (line 170) — one-time +100, idempotent via a `RepHistory.findFirst({ source: "profile-complete" })` guard.

Call sites:

| File | Trigger | Points |
|---|---|---|
| `app/api/posts/route.ts:294` | First published post ever | +5 (`first-post`) |
| `app/api/posts/route.ts:301` (`awardRepWithDailyCap`) | Per house-tagged post, capped 10/day | +2 (`housePost`) |
| `app/api/houses/[slug]/join/route.ts:38` | Joining a house (one-time per house) | +10 (`house-joined`) |
| `app/api/admin/rep-adjustment/route.ts:64` | Admin manual adjustment | arbitrary delta, source `"admin-adjustment"` |
| `app/api/profile/route.ts:164` | After profile save, via `checkProfileCompleteBonus` | +100 one-time |
| `lib/auth/session.ts:37` | Every `getCurrentUser()`, via `touchDailyLogin` (fire-and-forget) | +5 / +50 / +300 |
| `lib/auth/ritual.ts:61` | Initiation Ritual step 4 (first Newcomers-room message) | +100, source `first-community-intro` |
| `lib/rating/level-progression.ts:61` (`promote()`) | Inviter's invitee reaches Level II | +500 to inviter |
| `lib/rating/referral-lifecycle.ts:74` | Invitee stays active 90+ days | +1000 to inviter, keyed per-referral |

**Discrepancy found:** `REP_TABLE`'s comments (lines 25, 36) claim `verificationPassed` (+200) and `invitedNewMember` (+15) are `wired: true` at admin-approval route `app/api/admin/applications/[id]/route.ts`. That route and the shared logic it delegates to (`lib/admin/waitlist-decisions.ts`) do **not** call `awardRep` or reference `REP_TABLE` anywhere. Yet live data has 2 `RepHistory` rows with `source: "verification"` totaling +400, with no current code path producing that string — likely stale documentation or a since-removed call site. Not resolved; flagging only.

## 4. Readers

- `app/(platform)/profile/[username]/page.tsx:189` — REP number display (`REP_NUMBER_ENABLED`), "Recent REP Changes" list via `prisma.repHistory.findMany` (line 107, gated by `REP_HISTORY_UI_ENABLED`, own profile only).
- `app/(platform)/hall/page.tsx:220` — same pattern, `repHistory` query at line 121.
- `app/(platform)/vault/page.tsx` — real gating: `const locked = user.rep < item.minRep` (lines 59, 92), computes `repShort` for an analytics event. Currently unreachable by real users — whole page short-circuited to a teaser by `VAULT_UI_ENABLED = false` — but the logic is fully written and live-data-correct.
- `app/(platform)/admin/page.tsx`, `components/admin/PersonDetail.tsx` / `AdminConsole.tsx` — display `rep`, `trustScore`, per-member `repHistory` list.
- `components/shared/RepAdjustmentForm.tsx` — admin-only form at `/admin/rep`, posts to `/api/admin/rep-adjustment`.
- `lib/rating/level-progression.ts:27`, `lib/rating/level-progress.ts:29` — read `user.reputation` (star average), **not** `user.rep`. Do not conflate.

## 5. `lib/analytics/track.ts` — server-only convention

```ts
import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type TrackInput = {
  userId?: string | null;
  type: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
};

export async function track(input: TrackInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: { ...input, meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  } catch (err) {
    console.error("[analytics] track failed", input.type, err);
    // Never throw — analytics must not break the user-facing flow it's instrumenting.
  }
}
```

`import "server-only"` as the literal first line (same guard as `lib/db/prisma.ts`, `lib/auth/supabase-admin.ts`). Swallows and logs errors rather than throwing.

**Contrast:** `awardRep` does not use `"server-only"` today and does not swallow errors uniformly — it's a critical write inside its own `$transaction`, called with `.catch(console.error)` at non-critical sites (`session.ts`, `profile/route.ts`) but allowed to throw at others (post creation, house join, admin adjustment). A new ledger service adopting `track()`-style conventions would diverge from `awardRep`'s current error-handling philosophy.

## 6. Live data (read-only queries only; scratch script deleted after)

```
Total users: 5
Users with non-zero rep: 5
Users with non-default (100) trustScore: 0
RepHistory row count: 74
```

| email | username | displayName | rep | status | createdAt |
|---|---|---|---|---|---|
| rtmaksim15@gmail.com | max | Max | 580 | active | 2026-07-25 |
| lord.obsidian.oc@gmail.com | lord-obsidian-oc-7cbf | Lord Obsidian | 320 | active | 2026-07-06 |
| tomakarpeniuk@gmail.com | toma | Toma | 230 | active | 2026-09-25 |
| 20created02@gmail.com | 20created02_2296 | Andrii | 220 | active | 2026-09-24 |
| hfjhgfhfffjnknfhh@gmail.com | hfjhgfhfffjnkn_ | Тома2 | 205 | inactive | 2026-09-25 |

**No account uses the `test-` prefix** CLAUDE.md §7 requires before treating data as safely removable.

- `rtmaksim15@gmail.com` (Max) and `lord.obsidian.oc@gmail.com` are real operator accounts (founder, admin bootstrap), not member test data.
- `tomakarpeniuk@gmail.com` (Toma) and `20created02@gmail.com` (Andrii) read as **real invited members** — real-looking names/emails, `active` status, real REP (230 / 220).
- `hfjhgfhfffjnknfhh@gmail.com` ("Тома2") looks like throwaway/test data (keyboard-mash email, "2" suffix duplicating Toma's name, same-day creation, the only `inactive` row) but does **not** carry the `test-` marker — per CLAUDE.md rule 7, flagging for confirmation rather than assuming it's safe to touch.

`RepHistory` grouped by `source` (74 rows total):

| source | rows | Σ delta |
|---|---|---|
| `login-streak` | 56 | +325 |
| `first-community-intro` | 4 | +400 |
| `admin-adjustment` | 2 | 0 (nets to zero) |
| `verification` | 2 | +400 | ⚠️ no current code path writes this source (see §3) |
| `profile-complete` | 4 | +400 |
| `first-post` | 6 | +30 |

## 7. Feature flags — `lib/config/feature-flags.ts`

CLAUDE.md (last updated 2026-09-22) still refers to a single `REP_UI_ENABLED` flag; it no longer exists — split 2026-09-27 into:

| Flag | Value | Gates |
|---|---|---|
| `REP_NUMBER_ENABLED` | **`true`** | REP number on `/hall`, `/profile/[username]`, `/admin/rep` + `POST /api/admin/rep-adjustment` |
| `REP_HISTORY_UI_ENABLED` | `false` | "Recent REP Changes" list on `/hall` / own profile |
| `REVIEWS_UI_ENABLED` | `false` | `User.reputation` stars, review form/list |
| `TRUST_SCORE_UI_ENABLED` | `false` | Trust Score on `/hall` |
| `VAULT_UI_ENABLED` | `false` | All of `/vault` |
| `LEVELS_UI_ENABLED` | `true` | Level name + avatar level-ring |
| `LEVEL_PROGRESS_UI_ENABLED` | `false` | "Your Next Level" checklist on `/hall` |

Every flag gates rendering only — the underlying write logic (`rep-engine.ts`, `RepHistory` writes, `checkLevelUp`, `referral-lifecycle.ts`) runs unconditionally regardless of flag state. REP has been accruing the whole time and is now partially visible (`REP_NUMBER_ENABLED = true`), matching §6's live data.

## Bottom line — stopping here per the task's own instruction

Two findings, either one independently sufficient to stop:

1. **Real member data with REP exists.** The task's explicit assumption — "only test/admin accounts exist in production now, so legacy migration is safe" — does not hold. `tomakarpeniuk@gmail.com` (Toma) and `20created02@gmail.com` (Andrii) are real, active, invited members with real REP (230 and 220 respectively), not test or admin accounts. The task says: *"If the audit finds real member data with REP, stop after step 1 and report."* Doing so here.

2. **A working append-only REP ledger already exists and is live.** `RepHistory` (the ledger) + `User.rep` (the cached sum) + `awardRep`/`awardRepWithDailyCap` (the single choke-point writer) + `REP_TABLE` (the documented point catalog) already implement most of what the new package specifies — ledger table, cached score, category-sourced deltas, idempotent one-time bonuses, daily caps. Building the newly-specified `RepLedger` table, `RepCategory` enum, and `lib/rep/*` service from scratch would create a second, parallel REP system running alongside the existing live one (74 real ledger rows across 5 real users), not fill a gap. The two systems differ in several material ways the task would need to reconcile first — e.g. existing categories are informal `source` strings vs. the new fixed `RepCategory` enum; existing earn amounts (`first-post` +5, `house-joined` +10, `housePost` +2/day) don't map cleanly onto the new ACTIVITY/CLUB_VALUE/INVITED categories or their 400/600/300 monthly caps; there's no existing `trust_stars` multiplier or title high-water-mark concept; the existing system has no RLS policy on `rep_history` today (unconfirmed — not checked, since this alone doesn't change the stop decision).

Nothing beyond this file was written or changed. No Prisma schema edits, no migration, no new `lib/rep/` files. Branch `rep-core` was created but holds only this audit document.
