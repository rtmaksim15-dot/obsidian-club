# Obsidian Club — building with this design system

Obsidian Club is a **dark, ritual, members-only** aesthetic: near-black
backgrounds, a single burgundy accent, gold reserved for rank/achievement,
serif display type in all-caps. Components are shipped from the real app at
`window.ObsidianClub.*`.

## Setup — wrap the tree in NextNavProvider

Several components (ContentComposer, ReviewForm, ProfileEditForm, BottomNav,
AvatarUploadButton, RoomChat) call Next.js navigation hooks. Wrap any tree that
includes them in the provided context wrapper, or they throw / render blank:

```jsx
const { NextNavProvider, PostList, WaitlistForm } = window.ObsidianClub;

<NextNavProvider>
  <WaitlistForm />
  <PostList posts={posts} />
</NextNavProvider>
```

Leaf components with no navigation (LikeButton, ComingSoon, Reveal) work without
it, but wrapping everything is always safe.

## Styling idiom — Tailwind utilities + semantic classes, dark only

Style with **Tailwind utility classes on the `ob-*` palette** plus a set of
**semantic component classes** (defined in the shipped stylesheet). Never
introduce generic Tailwind blue/gray/green — only `ob-*`.

Palette (use as `bg-ob-*`, `text-ob-*`, `border-ob-*`):
`ob-black` #0A0908 (page) · `ob-dark` #111009 · `ob-elevated` #1A1816 ·
`ob-surface` #221F1C (inputs) · `ob-accent` #8B1A1A (burgundy, the one accent) ·
`ob-accent-h` hover · `ob-gold` #C9A84C (rank/achievement only) ·
`ob-text` #EDEAE4 · `ob-muted` #9E9A94 · `ob-subtle` #5C5955 · `ob-border`.

Semantic classes (prefer these over hand-rolling — they carry the type scale,
spacing and states):

| Family | Classes |
|---|---|
| Type | `text-display` `text-h1` `text-h2` `text-label` `text-body` `text-caption` `text-data` |
| Buttons | `btn-primary` (burgundy) · `btn-secondary` (outline) · `btn-ghost` |
| Surfaces | `card` · `card-premium` · `card-profile` |
| Inputs | `input` · `input-label` |
| Avatars | `avatar` + `avatar-level-1` … `avatar-level-6` (rank ring, gold at 5–6) |
| Misc | `star-filled` / `star-empty` · `divider-accent` |

Fonts: `font-cinzel` (headings/brand — all-caps, letter-spaced), `font-cormorant`
(body serif), `font-inter` (labels, data, UI). Brand tracking: `tracking-brand`,
`tracking-wide-brand`, `tracking-ultra`. The `text-*` classes already set the
right family; reach for `font-*` only for custom composition.

Colors are also exposed as CSS variables (`var(--color-accent)`,
`var(--color-gold)`, `var(--color-text-primary)`, …) — use these for inline
styles where a utility doesn't fit.

## Where the truth lives

- `styles.css` (and its `@import` closure, incl. `_ds_bundle.css`) — the full
  token + component-class source. Read it before styling new markup.
- `components/<group>/<Name>/<Name>.prompt.md` + `<Name>.d.ts` — per-component
  usage and the exact props contract.
- `guidelines/docs/` — the brand's own UI / UX / Philosophy / visual-identity
  notes (`UI.md`, `LordObsidian.md`) for tone and rules.

## Idiomatic snippet

```jsx
const { NextNavProvider, LikeButton } = window.ObsidianClub;

<NextNavProvider>
  <article className="card">
    <p className="text-h2 !text-lg">On Restraint</p>
    <p className="text-body mt-2 text-ob-muted">
      The strongest signal you can send in a room is the thing you choose not to say.
    </p>
    <div className="mt-4 flex items-center gap-5">
      <LikeButton postId="p1" initialCount={92} initialLiked={false} />
      <span className="text-caption">11 comments</span>
    </div>
  </article>
</NextNavProvider>
```
