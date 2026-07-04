# Architecture Decision Records

One file per significant *technical* decision. Use [template.md](template.md)
for new ones. Numbered sequentially, never reused or renumbered — a
superseded decision gets a new ADR that says so, the old one's `Status`
changes to `Superseded by ADR-NNNN`, its content stays intact as history.

For non-technical (product/process) decisions, or a chronological view that
spans both, see [DECISIONS.md](../../DECISIONS.md) instead — it links back
to these where a decision has a technical deep-dive.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-pin-nextjs-14-tailwind-v3.md) | Pin Next.js 14 + Tailwind CSS v3 (not latest) | Accepted |
| [0002](0002-pin-prisma-v6.md) | Pin Prisma to v6 (not v7) | Accepted |
| [0003](0003-remove-framer-motion-from-landing.md) | Remove framer-motion from the public landing page | Accepted |
| [0004](0004-extend-waitlist-schema.md) | Extend the Waitlist schema beyond the documented minimal columns | Accepted |
| [0005](0005-api-conventions.md) | API response/error conventions | Accepted |
| [0006](0006-landing-route-placement.md) | Landing page lives at `app/(landing)/page.tsx`, not `app/page.tsx` | Accepted |
| [0007](0007-landing-page-indexable.md) | Make the landing page indexable (`robots: index, follow`) | Accepted |
| [0008](0008-vercel-analytics-over-ga.md) | Vercel Analytics over Google Analytics | Accepted |
| [0009](0009-fix-contrast-without-changing-tokens.md) | Fix WCAG contrast failures without changing brand tokens | Accepted |
| [0010](0010-supabase-auth.md) | Supabase Auth for authentication | Accepted |
| [0011](0011-isadmin-field.md) | Add `isAdmin` to the `User` model | Accepted |
| [0012](0012-waitlist-status-tracking.md) | Add status tracking to the `Waitlist` model | Accepted |
| [0013](0013-initiation-ritual-step4-deferred.md) | Initiation Ritual step 4 auto-satisfied pending Rooms | Accepted |
| [0014](0014-adopt-oc-master-as-strategic-source.md) | Adopt OC_MASTER.md as strategic source of truth; keep existing technical foundation | Accepted |
