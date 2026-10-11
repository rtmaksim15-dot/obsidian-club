"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import SideSheet from "./SideSheet";
import SignOutButton from "./SignOutButton";
import { CIRCLES_UI_ENABLED, SEAL_UI_ENABLED, BOUNDARIES_UI_ENABLED } from "@/lib/config/feature-flags";

export type MineMenuProps = {
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
  title: string | null;
  inviteAllowance: number;
  hasOutstandingMemberInvite: boolean;
  initialVeilEnabled: boolean;
};

type Props = MineMenuProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="nav-control text-body block py-2">
      {children}
    </a>
  );
}

// "Soon" label matches PostSheet.tsx's own disabled rows exactly
// (Navigation v2 fix pass, item 7, 2026-10-11, see DECISIONS.md) — a
// plain <p>, never a link/button, so it was already untappable; this
// just adds the same visible label PostSheet already uses.
function SoonRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body flex items-center gap-2 py-2" style={{ color: "var(--color-text-muted)" }}>
      <Lock size={14} strokeWidth={1.5} />
      {children} <span className="text-caption">Soon</span>
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-cinzel text-xs uppercase tracking-brand mt-6 mb-1" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </p>
  );
}

async function createMemberInvite(router: ReturnType<typeof useRouter>, setBusy: (b: boolean) => void, setError: (e: string | null) => void) {
  setBusy(true);
  setError(null);
  const res = await fetch("/api/invites/member", { method: "POST" });
  const body = await res.json().catch(() => ({}));
  setBusy(false);
  if (!res.ok) {
    setError(body?.error ?? "Could not create invitation.");
    return;
  }
  router.refresh();
}

// Navigation v2, B5 (2026-10-10, see DECISIONS.md).
// - "My Circle" is treated as part of the not-yet-built Circles feature
//   (same flag as THE WORLD drawer's "Circles" row), not repurposed
//   onto the unrelated Follow system — omitted while CIRCLES_UI_ENABLED
//   is false, same as that row.
// - "Keepsakes" uses the existing Like model (no Bookmark model exists,
//   but the task's own spec allows either) — always shown, not flagged.
// - Seal of Authenticity / My Boundaries: new flags, both default false,
//   neither feature exists yet.
export default function MineMenu({
  open,
  onOpenChange,
  displayName,
  avatarUrl,
  username,
  title,
  inviteAllowance,
  hasOutstandingMemberInvite,
  initialVeilEnabled,
}: Props) {
  const router = useRouter();
  const [veil, setVeil] = useState(initialVeilEnabled);
  const [veilPending, setVeilPending] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function toggleVeil() {
    const next = !veil;
    setVeil(next);
    setVeilPending(true);
    try {
      await fetch("/api/profile/veil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ veil: next }),
      });
      router.refresh();
    } finally {
      setVeilPending(false);
    }
  }

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} side="right" title="Mine">
      <div className="flex items-center gap-3">
        <div className="avatar h-14 w-14">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ob-surface text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-data">{displayName}</p>
          {/* Title only — never the REP number, per spec. */}
          {title ? (
            <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
              {title}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        {username ? <Row href={`/profile/${username}`}>View my profile</Row> : null}
      </div>

      {CIRCLES_UI_ENABLED ? <Row href="/circles">My Circle</Row> : null}
      <Row href="/keepsakes">Keepsakes</Row>
      {SEAL_UI_ENABLED ? <Row href="/seal">Seal of Authenticity</Row> : <SoonRow>Seal of Authenticity</SoonRow>}
      {BOUNDARIES_UI_ENABLED ? <Row href="/boundaries">My Boundaries</Row> : <SoonRow>My Boundaries</SoonRow>}

      <SectionTitle>Invitations</SectionTitle>
      <p className="text-body">
        {inviteAllowance > 0
          ? `You hold ${inviteAllowance} ${inviteAllowance === 1 ? "invitation" : "invitations"}.`
          : "No invitations remain."}
      </p>
      {!hasOutstandingMemberInvite && inviteAllowance > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={inviteBusy}
            onClick={() => createMemberInvite(router, setInviteBusy, setInviteError)}
          >
            {inviteBusy ? "Vouching…" : "Vouch for someone"}
          </button>
          {inviteError ? (
            <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>
              {inviteError}
            </p>
          ) : null}
        </div>
      ) : null}

      <SectionTitle>Settings</SectionTitle>
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-body">Veil</p>
          <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Blur images until tapped
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={veil}
          aria-label="Veil"
          disabled={veilPending}
          onClick={toggleVeil}
          className="nav-control relative h-6 w-11 rounded-full transition-colors"
          style={{ backgroundColor: veil ? "var(--color-accent)" : "var(--color-border)" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
            style={{ transform: veil ? "translateX(22px)" : "translateX(2px)" }}
          />
        </button>
      </div>
      <Row href="/notifications">Notifications</Row>
      <Row href="/profile/edit">Account</Row>

      <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
        <SignOutButton variant="quiet" />
      </div>
    </SideSheet>
  );
}
