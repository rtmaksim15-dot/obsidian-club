import { describe, expect, it, vi } from "vitest";
import { createHistoryGuard } from "./history-guard";

function makeFakeDeps() {
  let listener: (() => void) | null = null;
  return {
    pushState: vi.fn(),
    back: vi.fn(),
    addPopStateListener: vi.fn((fn: () => void) => {
      listener = fn;
    }),
    removePopStateListener: vi.fn(() => {
      listener = null;
    }),
    firePopState: () => listener?.(),
  };
}

describe("createHistoryGuard", () => {
  it("pushes a history entry and registers a popstate listener on creation", () => {
    const deps = makeFakeDeps();
    createHistoryGuard(deps, vi.fn());

    expect(deps.pushState).toHaveBeenCalledTimes(1);
    expect(deps.addPopStateListener).toHaveBeenCalledTimes(1);
  });

  it("requestClose() calls history.back(), not onClose() directly", () => {
    const deps = makeFakeDeps();
    const onClose = vi.fn();
    const guard = createHistoryGuard(deps, onClose);

    guard.requestClose();

    expect(deps.back).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("onClose fires when the browser/system Back pops the pushed entry (popstate)", () => {
    const deps = makeFakeDeps();
    const onClose = vi.fn();
    createHistoryGuard(deps, onClose);

    deps.firePopState();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an explicit close (requestClose -> back() -> popstate) ends up calling onClose exactly once", () => {
    const deps = makeFakeDeps();
    const onClose = vi.fn();
    const guard = createHistoryGuard(deps, onClose);

    guard.requestClose();
    // In a real browser, deps.back() is what fires the popstate event —
    // the fake simulates that handoff explicitly, since it has no real
    // history stack to pop.
    deps.firePopState();

    expect(deps.back).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dispose() removes the popstate listener so a later pop no longer calls onClose", () => {
    const deps = makeFakeDeps();
    const onClose = vi.fn();
    const guard = createHistoryGuard(deps, onClose);

    guard.dispose();
    deps.firePopState();

    expect(deps.removePopStateListener).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
