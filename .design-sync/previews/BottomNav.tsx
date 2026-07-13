import { BottomNav } from "obsidian-club";

// Mobile bottom navigation (Feed / Shop / Community / Library / Profile).
// Hidden at >=640px by design, so it only shows in a mobile-width viewport
// (see cfg.overrides.BottomNav). The active tab is derived from the current
// path, which the preview provider pins to /feed.
export const Mobile = () => <BottomNav />;
