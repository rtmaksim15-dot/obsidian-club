import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canGoBack, recordPageLoad, resolveBackTarget } from "./back-target";

describe("resolveBackTarget — TopBar's back button (PWA hardening, Package 3)", () => {
  it("an earlier page was recorded in this tab -> history.back()", () => {
    expect(resolveBackTarget(true)).toEqual({ type: "back" });
  });

  it("no earlier page recorded (deep link, bookmark, fresh standalone launch) -> /feed", () => {
    expect(resolveBackTarget(false)).toEqual({ type: "path", path: "/feed" });
  });
});

// This app has no next/link anywhere — every internal navigation is a
// full page load (plain <a>), so recordPageLoad()/canGoBack() have to
// work via sessionStorage across separate "page loads" rather than via
// React state within one mount. vitest's "node" environment (see
// vitest.config.ts) has no sessionStorage global, so these tests stand
// one in for the browser with a minimal in-memory mock.
function installFakeSessionStorage() {
  const store = new Map<string, string>();
  (globalThis as { sessionStorage?: Storage }).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("recordPageLoad / canGoBack — simulating this app's all-full-page-load navigation", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  });

  it("the first page load in a fresh tab has nothing to go back to", () => {
    recordPageLoad();
    expect(canGoBack()).toBe(false);
  });

  it("a second page load in the same tab (after the first recorded itself) can go back", () => {
    recordPageLoad(); // first page (e.g. /feed, reached by logging in)
    recordPageLoad(); // second page (e.g. /terms, reached by clicking a link)
    expect(canGoBack()).toBe(true);
  });

  it("every page load after the first also can go back", () => {
    recordPageLoad();
    recordPageLoad();
    recordPageLoad();
    expect(canGoBack()).toBe(true);
  });
});
