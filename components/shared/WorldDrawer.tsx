import { ArrowUpRight } from "lucide-react";
import SideSheet from "./SideSheet";
import pkg from "@/package.json";
import {
  CHRONICLES_UI_ENABLED,
  CIRCLES_UI_ENABLED,
  GATHERINGS_UI_ENABLED,
  ATLAS_UI_ENABLED,
} from "@/lib/config/feature-flags";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- placeholder for future per-user content; keeps TopBar's spread call stable if this grows
export type WorldDrawerProps = {};

type Props = WorldDrawerProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Row({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-body flex items-center gap-1 py-2"
    >
      {children}
      {external ? <ArrowUpRight size={14} strokeWidth={1.5} /> : null}
    </a>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-cinzel text-xs uppercase tracking-brand mt-6 mb-1" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </p>
  );
}

// Navigation v2, B4 (2026-10-10, see DECISIONS.md). Per the task's own
// ASSUMPTION clause: link to existing routes; a destination with no
// real route is OMITTED here, not invented — Rules (only exists inside
// the ritual/DM-rules flows, not as a standalone page), How to report
// (reporting is an inline modal, no explainer page), 2257 Statement
// and About the Club (neither has a public route; the former also
// touches legal content this task explicitly says not to create) are
// all left out. See DECISIONS.md/TECH_DEBT.md for the full list.
export default function WorldDrawer({ open, onOpenChange }: Props) {
  const shopUrl = process.env.NEXT_PUBLIC_SHOP_URL;

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} side="left" title="The World">
      <nav>
        {CHRONICLES_UI_ENABLED ? <Row href="/chronicles">Chronicles</Row> : null}
        {CIRCLES_UI_ENABLED ? <Row href="/circles">Circles</Row> : null}
        {GATHERINGS_UI_ENABLED ? <Row href="/gatherings">Gatherings</Row> : null}
        {ATLAS_UI_ENABLED ? <Row href="/atlas">Atlas &amp; Lexicon</Row> : null}
        {shopUrl ? <Row href={shopUrl} external>Torros</Row> : null}

        <SectionTitle>Trust &amp; Safety</SectionTitle>
        <Row href="/codex">Codex</Row>

        <SectionTitle>Legal</SectionTitle>
        <Row href="/terms">Terms</Row>
        <Row href="/privacy">Privacy</Row>
        <Row href="/dmca">DMCA</Row>
        <Row href="mailto:support@obsidianclub.online">Help</Row>
      </nav>

      <p className="text-caption mt-10" style={{ color: "var(--color-text-muted)" }}>
        Language: EN · v{pkg.version}
      </p>
    </SideSheet>
  );
}
