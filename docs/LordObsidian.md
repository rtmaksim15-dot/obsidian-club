# Lord Obsidian — Canonical Persona Spec

> Source: a visual identity package Max added to the iCloud docs folder
> under `Визуал/` (2026-07-04) — two brand identity guide sheets and a
> character/image-generation spec for Lord Obsidian, plus reference
> portraits. This is the first **concrete, detailed** spec for the
> persona; before this, `CLAUDE.md`/`OC_MASTER.md`/[Vision.md](Vision.md)
> only described Lord Obsidian in the abstract ("mysterious founder
> persona," "authoritative, mysterious, protective" tone). Nothing here
> contradicts those — this fills in detail they left open, per the same
> "documentation is the source of truth" rule as everywhere else in
> `docs/`.
>
> The full source images aren't committed to this repo (large binaries,
> and one variant includes background art not appropriate to publish as
> a web-servable asset) — they stay in the iCloud folder. Two specific
> crops derived from them **are** committed as real web assets (see
> "What changed" below) — this page is the durable, text-form record of
> what the full source material establishes.

## Identity

- **Name:** Lord Obsidian. Age 30–45 in appearance. Solo persona — Max
  himself (confirmed in `OC_MASTER.md`, see [Vision.md](Vision.md#the-central-figure)).
- **Physical description** (for consistent future image generation —
  the source includes a full Midjourney prompt built around a fixed
  reference face): bald, thick black beard (no gray), dark eyes, strong
  jaw, large athletic build. Round dark (occasionally clear/pince-nez)
  glasses. Always impeccably dressed — see Canon rules below.
- **Personality:** calm, confident, in control. Speaks rarely and only
  when it matters — listens more than he talks. Commanding presence
  without needing volume; people quiet down when he enters a room. A
  leader, strategist, and protector of his circle. Uncompromising on
  principle.
- **Voice/communication:** few words, always purposeful. Comfortable
  with silence — uses pauses deliberately. Low, calm, confident register.
  This matches [Philosophy.md](Philosophy.md#brand-voice-oc_masterMD)'s
  "authoritative, mysterious, protective" — this section is the detailed
  version of that one line.
- **Manner:** sits upright, controlled and unhurried gestures, direct
  gaze, never flustered, always composed. Keeps distance from most, but
  open with those inside his circle.

## Canon rules (what's on-brand / off-brand for this persona)

**On-brand:** perfectly tailored three-piece suit (black or dark grey,
occasionally light — vest is mandatory), black or white shirt with a
dark tie or neck scarf, a long premium overcoat, a top hat or wide-brim
felt hat, classic leather shoes, black leather gloves, a pocket watch, a
ring set with a black obsidian stone (right hand), a cane, cufflinks —
every metal accessory bears the OC symbol, in silver, gold, or platinum.
Settings: private clubs, libraries/studies, premium hotels, cigar rooms,
old European streets with vintage cars, yachts, penthouses. Atmosphere:
power without aggression, luxury without ostentation, discipline,
respect earned through silence.

**Off-brand — never:** casual or sport clothing, t-shirts, jeans, bright
colors, cheap materials, sloppiness, any look outside this canon. For
image generation specifically: never change the reference face, beard
shape, or ethnicity; no aging up/down or changing build; no
cartoon/3D/anime rendering; no fantasy, cyberpunk, steampunk, gothic, or
horror styling; no visible text, logos, or watermarks in generated
images.

## Symbolism (the OC monogram)

Confirms and extends what `CLAUDE.md` already established
(`components/ui/Logo.tsx`, [docs/UI.md](UI.md)):

- **O** — Obsidian. Strength, stability, protection.
- **C** — Community. Connection, loyalty, belonging.
- **The spear** (a small diamond/dagger glyph on the axis between O and
  C) — focus, control, direction. "The axis that holds strength (O) and
  community (C) in balance." **New in this pass** — not previously
  documented. `Logo.tsx` now renders the real cropped monogram artwork
  (`public/brand/oc-monogram.webp`, cropped from
  `Визуал/C733A838-...png`), which includes this spear natively — see
  `TECH_DEBT.md`.

## Color palette & materials — confirmed match, no changes needed

The guide's palette (Deep Black, Dark Burgundy, Silver, Gold, Platinum/
Ivory — white permitted only on-site/digital) and materials (leather,
dark wood, black marble, velvet) **match this codebase's existing design
tokens exactly** — see [UI.md](UI.md#color-tokens-appglobalscss-root-mirrored-as-ob--in-tailwindconfigts):
`--color-bg-primary` (#0A0908, deep black), `--color-accent` (#8B1A1A,
dark burgundy), `--color-gold` (#C9A84C). No token changes needed; this
is a confirmation, not a correction.

## Values

Two overlapping value sets appear across the source material — recorded
both, not merged into a guess at which is canonical:

- **The eight-value set:** Discipline, Dignity, Responsibility, Trust,
  Mastery, Respect, Honesty, Voluntariness (Добровольность).
- **The five-value "philosophy" set**, each with its own gloss: **Power**
  ("not a right, but a duty"), **Discipline** ("mastering yourself is
  mastering everything"), **Trust** ("earned, not demanded"), **Respect**
  ("to yourself, to others, to the rules"), **Freedom** ("through
  conscious choice").

**Founder's quote** (attributed to Lord Obsidian in the source):
> "Power is not a privilege. It is a responsibility to yourself and to
> those around you."

**Tagline:** POWER. DISCIPLINE. TRUST. — added to the Landing hero this
pass (`app/(landing)/page.tsx`).

## What changed in the codebase this pass (2026-07-04)

- `components/ui/Logo.tsx` — first added a hand-drawn spear glyph between
  O and C (SVG approximation), then replaced entirely with a real
  cropped image, `public/brand/oc-monogram.webp` (cropped + re-encoded
  from `Визуал/C733A838-...png`, Max: "там есть фото с чётким логотипом
  который тебе нужно использовать"). Still a **raster crop, not a true
  vector asset** — see `TECH_DEBT.md`.
- Landing hero — added the "POWER. DISCIPLINE. TRUST." tagline beneath
  the wordmark.
- Landing's "Lord Obsidian — above all" card — added a real portrait,
  `public/brand/lord-obsidian.jpg` (cropped/compressed from
  `Визуал/C3BA0C0F-...png`, the library-armchair/cigar/cane shot — chosen
  because it's the "hero" pose used in both identity-guide sheets, and
  has no background elements unsuitable for a public page). Confirmed by
  Max via `AskUserQuestion` (2026-07-04: "Да, подключить") before wiring
  a real human-likeness image into the live product.

## Available, not (yet) used

The source material includes several more reference portraits (the same
generated face across other settings/poses) beyond the one now wired in.
They remain in the iCloud `Визуал/` folder, not committed here, as
further options if Max wants a different pose in a different spot later
(e.g. `/ritual`'s Lord Obsidian intro material once its text content
exists, or admin-approval emails "from Lord Obsidian"). One variant
(`4D812A56-...png`) includes background art not appropriate to publish as
a web asset and should be excluded from any future selection.
