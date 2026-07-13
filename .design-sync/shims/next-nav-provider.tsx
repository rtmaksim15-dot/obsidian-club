// Preview provider for design-sync (cfg.provider).
//
// Several Obsidian Club components call next/navigation hooks at render time —
// useRouter() (ContentComposer, ReviewForm, ProfileEditForm, AvatarUploadButton)
// throws "invariant expected app router to be mounted" outside Next's
// AppRouterContext, and usePathname() (BottomNav) returns null and then crashes
// on pathname.startsWith(). Neither Next context exists in the design runtime.
//
// This wrapper supplies stub AppRouterContext / PathnameContext /
// SearchParamsContext so those hooks resolve. The router methods are no-ops:
// previews are static, so navigation never fires. It is bundled as a real
// export (window.<GLOBAL>.NextNavProvider) via cfg.extraEntries and wraps every
// preview card; components that don't read these contexts ignore it.

import * as React from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Some components read Next public env vars at effect time (e.g. RoomChat →
// Supabase createBrowserClient reads process.env.NEXT_PUBLIC_SUPABASE_*). In
// the design runtime `process` is undefined, and an uncaught throw inside a
// useEffect unmounts the whole React root (React 18), blanking the card. This
// module is bundled and its top-level code runs at load, before any render, so
// stubbing process.env here lets those clients construct (they simply never
// connect — the sockets fail asynchronously, which is harmless for a preview).
const g = globalThis as unknown as { process?: { env: Record<string, string> } };
g.process = g.process ?? { env: {} };
g.process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://demo.supabase.co";
g.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "demo-anon-key";

const router = {
  push: async () => true,
  replace: async () => true,
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
};

export function NextNavProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(
    AppRouterContext.Provider as React.Provider<unknown>,
    { value: router },
    React.createElement(
      PathnameContext.Provider as React.Provider<unknown>,
      { value: "/feed" },
      React.createElement(
        SearchParamsContext.Provider as React.Provider<unknown>,
        { value: new URLSearchParams() },
        children,
      ),
    ),
  );
}
