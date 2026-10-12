# REP scale-migration diagnostic (2026-10-02, package 1c)

Read-only. No writes, no `--apply`, no schema changes. Ran against production via ad-hoc read-only queries (scratch scripts, deleted after).

## 1. Per-user `rep_history` breakdown (source | reason | count | sum | first → last)

**lord.obsidian.oc@gmail.com** (rep=320, joined 2026-07-06):
| source | reason | count | sum | first | last |
|---|---|---|---|---|---|
| verification | Verification passed | 1 | 200 | 2026-07-06 | 2026-07-06 |
| login-streak | Daily login | 21 | 105 | 2026-07-15 | 2026-10-01 |
| admin-adjustment | Temporary test drop to verify Vault REP-gating (15 REP scenario) | 2 | 0 | 2026-07-16 | 2026-07-16 |
| first-post | First post | 3 | 15 | 2026-07-29 | 2026-09-18 |

**rtmaksim15@gmail.com** / Max (rep=580, joined 2026-07-25):
| source | reason | count | sum | first | last |
|---|---|---|---|---|---|
| verification | Verification passed | 1 | 200 | 2026-07-25 | 2026-07-25 |
| login-streak | Daily login | 25 | 170 | 2026-07-25 | 2026-10-01 |
| profile-complete | Profile 100% complete | 1 | 100 | 2026-07-25 | 2026-07-25 |
| first-community-intro | First community introduction | 1 | 100 | 2026-07-29 | 2026-07-29 |
| first-post | First post | 2 | 10 | 2026-07-30 | 2026-09-29 |

**20created02@gmail.com** / Andrii (rep=220, joined 2026-09-24):
| source | reason | count | sum | first | last |
|---|---|---|---|---|---|
| login-streak | Daily login | 4 | 20 | 2026-09-24 | 2026-10-01 |
| profile-complete | Profile 100% complete | 1 | 100 | 2026-09-24 | 2026-09-24 |
| first-community-intro | First community introduction | 1 | 100 | 2026-09-24 | 2026-09-24 |

**tomakarpeniuk@gmail.com** / Toma (rep=230, joined 2026-09-25):
| source | reason | count | sum | first | last |
|---|---|---|---|---|---|
| login-streak | Daily login | 5 | 25 | 2026-09-25 | 2026-10-01 |
| profile-complete | Profile 100% complete | 1 | 100 | 2026-09-25 | 2026-09-25 |
| first-community-intro | First community introduction | 1 | 100 | 2026-09-25 | 2026-09-25 |
| first-post | First post | 1 | 5 | 2026-09-25 | 2026-09-25 |

**hfjhgfhfffjnknfhh@gmail.com** / "Тома2" (rep=205, joined 2026-09-25):
| source | reason | count | sum | first | last |
|---|---|---|---|---|---|
| login-streak | Daily login | 1 | 5 | 2026-09-25 | 2026-09-25 |
| profile-complete | Profile 100% complete | 1 | 100 | 2026-09-25 | 2026-09-25 |
| first-community-intro | First community introduction | 1 | 100 | 2026-09-25 | 2026-09-25 |

**olgadvornikova2020@gmail.com** / Olga (rep=205, joined **2026-10-02T07:47:34.131Z** — today):
| source | reason | count | sum | first | last |
|---|---|---|---|---|---|
| login-streak | Daily login | 1 | 5 | 2026-10-02 | 2026-10-02 |
| profile-complete | Profile 100% complete | 1 | 100 | 2026-10-02 | 2026-10-02 |
| first-community-intro | First community introduction | 1 | 100 | 2026-10-02 | 2026-10-02 |

**Pattern**: every member who joined *after* the founder/admin accounts (Andrii, Toma, Тома2, Olga) shows the exact same shape — `profile-complete` (100) + `first-community-intro` (100) + a handful of `login-streak` days (5 each) [+ `first-post` (5) once they publish] — landing at 205–230. `verification` (200, both legacy accounts, orphaned source per the original REP_AUDIT.md — no current code path writes it) and the test `admin-adjustment` pair (nets to 0) only appear on the two oldest accounts and don't recur.

## 2. Legacy reason code → amount written today → scale

Every one of these values was copied verbatim from the pre-existing `REP_TABLE` in `lib/rating/rep-engine.ts` when package 1b wired the delegation — **none were rescaled**. They are all still on the **OLD** scale, while `lib/rep/config.ts#REP_TITLES` (Keeper=1000, Steward=2500, Warden=5000, Master=10000) is on the **NEW ×10** scale.

| reasonCode | amount written today | scale | legacy source | code path |
|---|---|---|---|---|
| `daily_login` | 5 | OLD | `login-streak` | `lib/rating/rep-engine.ts#touchDailyLogin`, called from `lib/auth/session.ts#getCurrentUser` every request |
| `login_streak_7` | 50 | OLD | `login-streak` | same |
| `login_streak_30` | 300 | OLD | `login-streak` | same |
| `profile_complete` | 100 | OLD | `profile-complete` | `lib/rating/rep-engine.ts#checkProfileCompleteBonus`, called from `app/api/profile/route.ts` after a profile save |
| `first_post` | 5 | OLD | `first-post` | `app/api/posts/route.ts`, first published post ever |
| `house_post` | 2 | OLD | `house-post` | `app/api/posts/route.ts`, per house-tagged post (daily cap 10) — unreachable today, `HOUSES_UI_ENABLED = false` |
| `house_joined` | 10 | OLD | `house-joined` | `app/api/houses/[slug]/join/route.ts` — unreachable today, same flag |
| `first_community_intro` | 100 | OLD | `first-community-intro` | `lib/auth/ritual.ts#getRitualStatus`, awarded the first time `/ritual` is viewed after a Newcomers-room message exists |
| `invitee_level_2` | 500 | OLD | `invitee-level-2:*` | `lib/rating/level-progression.ts` — gated on `LEVELS_UI_ENABLED`/review-star level, not REP |
| `invitee_active_90d` | 1000 | OLD | `referral-active-90d:*` | `lib/rating/referral-lifecycle.ts`, invitee active 90+ days |

**This is the real problem, bigger than the onboarding number itself**: the one-time scale migration (package 1b) only multiplies each user's *historical* total by 10, once. It does not — and structurally cannot, as currently scoped — touch the ongoing *rate*. Every future award via any of these 10 reason codes keeps writing the old, un-scaled amount (+5 for a daily login, +100 for completing onboarding) against thresholds that now expect 10× those numbers. A member who joins *after* `--apply` runs gets no retroactive bump at all unless someone manually re-runs the migration script against them specifically — and even then, every *subsequent* day's login/post still accrues at 1/10th the relative rate forever. The scale migration fixes a snapshot; it does not fix the machine that's still producing the old numbers.

## 3. Brand-new member, today, on paper — 205 REP

Traced from code (cross-confirmed exactly against Olga's and "Тома2"'s real, independent accounts — both land at precisely 205):

1. Member completes the Initiation Ritual: bio + avatar + username chosen, Code of Conduct, Lord Obsidian's introduction, one message in the Newcomers room, Safety & Respect guidelines. **Note: the ritual itself does not require a city** — only bio/avatar/username (`lib/auth/ritual.ts#getRitualStatus`, line 46: `Boolean(user.bio && user.avatarUrl && usernameChosen)`).
2. If they *also* fill in the optional **City** field on `/profile/edit` (a separate, stricter check — `lib/rating/rep-engine.ts#checkProfileCompleteBonus`, line 174: `Boolean(user.bio && user.avatarUrl && user.locationCity)`, a different field set than the ritual's own, triggered by `app/api/profile/route.ts` after any profile save): **+100** (`profile_complete`).
3. The first time they (or anything) loads `/ritual` *after* their Newcomers-room message exists, `getRitualStatus` fires its own idempotent check and awards: **+100** (`first_community_intro`).
4. Every authenticated request runs `touchDailyLogin` (`lib/auth/session.ts#getCurrentUser`); day one: **+5** (`daily_login`).

**Total: 205 REP**, with zero further action. If they also publish one post (not required by the ritual, but the obvious next step), add `first_post`: **+5 → 210**.

After the ×10 scale migration, 205 → **2050 — past the Keeper threshold (1000)**, immediately, from onboarding alone. If a city isn't filled in, it's 105 → 1050 — still Keeper. Either way: completing the free ritual puts a brand-new member at or above Keeper the moment the migration (or any future catch-up run) touches their account, with no real activity behind it.

## 4. olgadvornikova2020@gmail.com join date

`joinedAt`: **2026-10-02T07:47:34.131Z** (today, a few hours before this diagnostic ran — a real new member, not a test account).

## Bottom line

The dry-run's "everyone lands at Keeper" result isn't a migration bug — it's an accurate reflection of the current reward structure colliding with the new ×10 thresholds. Two separate things are true at once:
1. **The one-time migration, as scoped, is internally correct** (idempotent, additive, respects `repExempt`) — it does exactly what package 1b asked for.
2. **The thresholds and the legacy per-action amounts were never reconciled.** Title design assumed a ×10 world; the actual point source (`REP_TABLE`, now mirrored unscaled into `REASON_CATALOG`) still lives in the old one. Running `--apply` as currently built would make "Keeper" the de facto default tier for every member who's done nothing but join, and nothing in this package's scope fixes that going forward — only a decision to either (a) scale the legacy reason codes themselves (not just historical totals), or (b) revisit the title thresholds, resolves it. Flagging this rather than guessing which direction to take.
