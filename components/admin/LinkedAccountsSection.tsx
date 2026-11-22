"use client";

// Linked Accounts (2026-11-22, see DECISIONS.md) — shared between
// ApplicationDetail and PersonDetail so both card types show the exact
// same four fields, in the same order, with the same "None" fallback
// — never hidden, never a different shape depending on which kind of
// card it's on. An applicant card simply has nothing for Partner/
// Bonds/Brought in (those are post-registration concepts) and shows
// "None" for them like any other empty field, rather than omitting
// them — deliberate, per instruction: a consistent shape across every
// card type matters more here than trimming fields that happen to be
// empty for one of the two.
export type LinkedPartner = { id: string; displayName: string; handle: string | null };
export type LinkedBond = { id: string; kind: string; status: string; otherId: string; otherName: string };
export type LinkedInviter = { id: string; displayName: string };
export type LinkedBroughtIn = { id: string; type: "member" | "applicant"; displayName: string; status: string };

export default function LinkedAccountsSection({
  partner,
  bonds,
  invitedBy,
  unmatchedSponsorCode,
  broughtIn,
  onNavigateToPerson,
  onNavigateToApplication,
}: {
  partner: LinkedPartner | null;
  bonds: LinkedBond[];
  invitedBy: LinkedInviter | null;
  // Applications only: the raw sponsor code as submitted, when it
  // didn't match any member's referralCode — still worth an admin
  // seeing (see lib/invites/sponsor.ts's own comment).
  unmatchedSponsorCode: string | null;
  broughtIn: LinkedBroughtIn[];
  onNavigateToPerson: (id: string) => void;
  onNavigateToApplication?: (id: string) => void;
}) {
  return (
    <div className="mt-6 border-t border-ob-border pt-4" data-testid="linked-accounts">
      <p className="text-label mb-2">Linked Accounts</p>

      <p className="text-caption">
        Partner:{" "}
        {partner ? (
          <button type="button" className="underline" onClick={() => onNavigateToPerson(partner.id)}>
            {partner.displayName}
            {partner.handle ? ` @${partner.handle}` : ""}
          </button>
        ) : (
          "None"
        )}
      </p>

      <p className="text-caption mt-2">Bonds: {bonds.length === 0 ? "None" : null}</p>
      {bonds.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {bonds.map((b) => (
            <li key={b.id} className="text-caption">
              {b.kind.replace(/_/g, " ")} ({b.status}) —{" "}
              <button type="button" className="underline" onClick={() => onNavigateToPerson(b.otherId)}>
                {b.otherName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-caption mt-2">
        Invited by / Sponsor:{" "}
        {invitedBy ? (
          <button type="button" className="underline" onClick={() => onNavigateToPerson(invitedBy.id)}>
            {invitedBy.displayName}
          </button>
        ) : unmatchedSponsorCode ? (
          `code "${unmatchedSponsorCode}" (no match)`
        ) : (
          "None"
        )}
      </p>

      <p className="text-caption mt-2">Brought in: {broughtIn.length === 0 ? "None" : null}</p>
      {broughtIn.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {broughtIn.map((b) => (
            <li key={`${b.type}-${b.id}`} className="text-caption">
              <button
                type="button"
                className="underline"
                onClick={() => (b.type === "member" ? onNavigateToPerson(b.id) : onNavigateToApplication?.(b.id))}
              >
                {b.displayName}
              </button>{" "}
              <span style={{ color: "var(--color-text-muted)" }}>({b.status})</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
