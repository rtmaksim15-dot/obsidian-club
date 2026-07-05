import ComingSoon from "@/components/shared/ComingSoon";

// Real Shop is BACKLOG.md's "New scope from OC_MASTER.md" — physical
// products (Standard/Premium/Extra Premium), catalog, and payments
// (crypto + adult-friendly card processor, per CLAUDE.md 2026-07-05)
// need their own data model and a real payment-provider account before
// any of this is buildable. Placeholder only, same honest pattern as
// /events — see TECH_DEBT.md and ADR-0015.
export default function ShopPage() {
  return (
    <ComingSoon
      title="Shop"
      note="Obsidian Club's own products, and a vetted practitioner marketplace. Opening in a future version."
    />
  );
}
