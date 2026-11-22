// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ApplicationDetail from "./ApplicationDetail";
import type { Application } from "./AdminConsole";

// See PersonDetail.test.tsx's own comment — same reason this is needed.
afterEach(cleanup);

// Linked Accounts (2026-11-22, see DECISIONS.md) — this project's
// first component-render tests. The actual requirement being checked:
// every application card, regardless of status, shows the Linked
// Accounts section — never conditionally hidden.
function baseApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    name: "Jane Doe",
    email: "jane@example.com",
    age: 25,
    city: "Austin",
    source: null,
    reason: "A long enough answer to pass the minimum length check.",
    referralCode: null,
    origin: "card",
    status: "pending",
    createdAt: "2026-11-21T00:00:00.000Z",
    heldReason: null,
    heldNote: null,
    heldAt: null,
    reviewedAt: null,
    reviewerName: null,
    ageVerified: false,
    ageVerifiedAt: null,
    hasToken: false,
    decisionEmailSentAt: null,
    decisionEmailSendError: null,
    registered: null,
    memberAgeVerified: null,
    memberOnboardingComplete: null,
    sponsorId: null,
    sponsorName: null,
    ...overrides,
  };
}

const noop = () => {};

describe("ApplicationDetail — Linked Accounts section", () => {
  it.each(["pending", "held", "approved", "declined"] as const)("renders for status=%s", (status) => {
    render(
      <ApplicationDetail
        application={baseApplication({ status, registered: status === "approved" ? false : null })}
        onUpdate={noop}
        onClose={noop}
        onNavigateToPerson={noop}
      />,
    );
    expect(screen.getByTestId("linked-accounts")).toBeInTheDocument();
    expect(screen.getByText("Linked Accounts")).toBeInTheDocument();
  });

  it("shows None for Partner, Bonds, and Brought in — applications never have these", () => {
    render(<ApplicationDetail application={baseApplication()} onUpdate={noop} onClose={noop} onNavigateToPerson={noop} />);
    const section = screen.getByTestId("linked-accounts");
    expect(section.textContent).toContain("Partner: None");
    expect(section.textContent).toContain("Bonds: None");
    expect(section.textContent).toContain("Brought in: None");
  });

  it("shows the matched sponsor's name, linked", () => {
    const onNavigateToPerson = vi.fn();
    render(
      <ApplicationDetail
        application={baseApplication({ sponsorId: "user-1", sponsorName: "Max" })}
        onUpdate={noop}
        onClose={noop}
        onNavigateToPerson={onNavigateToPerson}
      />,
    );
    const link = screen.getByRole("button", { name: "Max" });
    link.click();
    expect(onNavigateToPerson).toHaveBeenCalledWith("user-1");
  });

  it("shows the raw code, unmatched, when sponsorId is null but a code was submitted", () => {
    render(
      <ApplicationDetail
        application={baseApplication({ sponsorId: null, sponsorName: null, referralCode: "abc123" })}
        onUpdate={noop}
        onClose={noop}
        onNavigateToPerson={noop}
      />,
    );
    expect(screen.getByTestId("linked-accounts").textContent).toContain('code "abc123" (no match)');
  });

  it("shows None for Invited by / Sponsor when there is no code at all", () => {
    render(<ApplicationDetail application={baseApplication()} onUpdate={noop} onClose={noop} onNavigateToPerson={noop} />);
    expect(screen.getByTestId("linked-accounts").textContent).toContain("Invited by / Sponsor: None");
  });
});
