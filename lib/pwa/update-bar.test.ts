import { describe, expect, it } from "vitest";
import { nextUpdateBarState } from "./update-bar";

describe("nextUpdateBarState — the update bar's state machine (no SW waiting / waiting / reloading)", () => {
  it("none -> waiting_detected -> waiting", () => {
    expect(nextUpdateBarState("none", "waiting_detected")).toBe("waiting");
  });

  it("waiting -> refresh_clicked -> reloading", () => {
    expect(nextUpdateBarState("waiting", "refresh_clicked")).toBe("reloading");
  });

  it("none -> refresh_clicked -> none (nothing waiting to refresh, ignored)", () => {
    expect(nextUpdateBarState("none", "refresh_clicked")).toBe("none");
  });

  it("reloading is terminal — a later waiting_detected doesn't revert it", () => {
    expect(nextUpdateBarState("reloading", "waiting_detected")).toBe("reloading");
  });

  it("reloading is terminal — a later refresh_clicked is a no-op", () => {
    expect(nextUpdateBarState("reloading", "refresh_clicked")).toBe("reloading");
  });

  it("controller_changed doesn't move state on its own — the reload is the caller's side effect", () => {
    expect(nextUpdateBarState("waiting", "controller_changed")).toBe("waiting");
  });
});
