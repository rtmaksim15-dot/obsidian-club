// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PersonDetail from "./PersonDetail";
import type { Person } from "./AdminConsole";

// RTL's automatic afterEach cleanup only fires when it detects a
// global `afterEach` (Jest-style globals); this suite imports from
// "vitest" explicitly rather than enabling `test.globals` for the
// whole project, so each render here needs tearing down by hand or
// the next test in this file finds duplicate elements from the
// previous one still mounted.
afterEach(cleanup);

// Linked Accounts (2026-11-22, see DECISIONS.md) — every member card
// shows the section, including a test account, with Delete Account
// always present at the bottom of the same panel.
function basePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "person-1",
    displayName: "Jane Doe",
    username: "janedoe",
    email: "jane@example.com",
    avatarUrl: null,
    rep: 10,
    level: 1,
    trustScore: 100,
    reputation: 4.5,
    ageVerified: true,
    ageVerifiedAt: "2026-11-01T00:00:00.000Z",
    isTest: false,
    ageVerificationProvider: null,
    ageVerificationMethod: null,
    ageVerificationAttempts: 0,
    ageVerificationLastAt: null,
    joinedAt: "2026-09-01T00:00:00.000Z",
    postCount: 2,
    commentCount: 1,
    invitedById: null,
    invitedByName: null,
    partnerId: null,
    partnerName: null,
    partnerUsername: null,
    broughtIn: [],
    bonds: [],
    repHistory: [],
    consents: [],
    adminActions: [],
    notes: [],
    ...overrides,
  };
}

const noop = () => {};

describe("PersonDetail — Linked Accounts section", () => {
  it("renders for an ordinary member with nothing linked", () => {
    render(
      <PersonDetail
        person={basePerson()}
        onUpdate={noop}
        onNavigateToPerson={noop}
        onNavigateToApplication={noop}
        onDeleted={noop}
      />,
    );
    const section = screen.getByTestId("linked-accounts");
    expect(section).toBeInTheDocument();
    expect(section.textContent).toContain("Partner: None");
    expect(section.textContent).toContain("Bonds: None");
    expect(section.textContent).toContain("Invited by / Sponsor: None");
    expect(section.textContent).toContain("Brought in: None");
  });

  it("renders for a test account — isTest never hides the section", () => {
    render(
      <PersonDetail
        person={basePerson({ isTest: true })}
        onUpdate={noop}
        onNavigateToPerson={noop}
        onNavigateToApplication={noop}
        onDeleted={noop}
      />,
    );
    expect(screen.getByTestId("linked-accounts")).toBeInTheDocument();
  });

  it("shows Partner with displayName and @handle, linked to their card", () => {
    const onNavigateToPerson = vi.fn();
    render(
      <PersonDetail
        person={basePerson({ partnerId: "toma2-id", partnerName: "Тома2", partnerUsername: "hfjhgfhfffjnkn_" })}
        onUpdate={noop}
        onNavigateToPerson={onNavigateToPerson}
        onNavigateToApplication={noop}
        onDeleted={noop}
      />,
    );
    const link = screen.getByRole("button", { name: "Тома2 @hfjhgfhfffjnkn_" });
    link.click();
    expect(onNavigateToPerson).toHaveBeenCalledWith("toma2-id");
  });

  it("shows a bond with kind and status, linked to the other party", () => {
    render(
      <PersonDetail
        person={basePerson({
          bonds: [{ id: "b1", kind: "dominant_of", status: "active", otherId: "other-id", otherName: "Alex", direction: "from" }],
        })}
        onUpdate={noop}
        onNavigateToPerson={noop}
        onNavigateToApplication={noop}
        onDeleted={noop}
      />,
    );
    expect(screen.getByTestId("linked-accounts").textContent).toContain("dominant of (active)");
    expect(screen.getByRole("button", { name: "Alex" })).toBeInTheDocument();
  });

  it("shows 'brought in' entries for both members and pending applicants", () => {
    render(
      <PersonDetail
        person={basePerson({
          broughtIn: [
            { id: "m1", type: "member", displayName: "Registered Member", status: "registered" },
            { id: "a1", type: "applicant", displayName: "Pending Applicant", status: "pending" },
          ],
        })}
        onUpdate={noop}
        onNavigateToPerson={noop}
        onNavigateToApplication={noop}
        onDeleted={noop}
      />,
    );
    const section = screen.getByTestId("linked-accounts");
    expect(section.textContent).toContain("Registered Member");
    expect(section.textContent).toContain("Pending Applicant");
  });

  it("always shows the Delete Account button at the bottom of the panel", () => {
    render(
      <PersonDetail
        person={basePerson()}
        onUpdate={noop}
        onNavigateToPerson={noop}
        onNavigateToApplication={noop}
        onDeleted={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeInTheDocument();
  });
});
