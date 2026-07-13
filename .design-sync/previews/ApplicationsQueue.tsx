import { ApplicationsQueue } from "obsidian-club";

const applications = [
  {
    id: "a1",
    name: "Adrian Kessler",
    email: "adrian.k@proton.me",
    age: 31,
    city: "Berlin",
    source: "Referral",
    referralCode: "OBS-4471",
    createdAt: "2026-07-09T10:12:00.000Z",
  },
  {
    id: "a2",
    name: null,
    email: "quiet.applicant@fastmail.com",
    age: 27,
    city: "Lisbon",
    source: "Instagram",
    referralCode: null,
    createdAt: "2026-07-11T18:44:00.000Z",
  },
  {
    id: "a3",
    name: "Mara Voss",
    email: "mara@vossatelier.com",
    age: 38,
    city: null,
    source: null,
    referralCode: "OBS-1180",
    createdAt: "2026-07-12T08:03:00.000Z",
  },
];

// Admin review queue — approve / decline pending applications.
export const Pending = () => (
  <div style={{ maxWidth: 640, padding: "1.5rem" }}>
    <ApplicationsQueue initial={applications} />
  </div>
);

// Cleared state.
export const Empty = () => (
  <div style={{ maxWidth: 640, padding: "1.5rem" }}>
    <ApplicationsQueue initial={[]} />
  </div>
);
