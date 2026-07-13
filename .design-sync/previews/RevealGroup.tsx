import { RevealGroup, RevealItem } from "obsidian-club";

// A group whose RevealItem children stagger their entrance by index
// (100ms per step). Shown here fully revealed.
export const Staggered = () => (
  <div style={{ maxWidth: 480, padding: "1.5rem" }}>
    <RevealGroup className="space-y-4">
      <RevealItem index={0} className="card">
        <p className="text-body">First — appears immediately.</p>
      </RevealItem>
      <RevealItem index={1} className="card">
        <p className="text-body">Second — a beat later.</p>
      </RevealItem>
      <RevealItem index={2} className="card">
        <p className="text-body">Third — later still.</p>
      </RevealItem>
    </RevealGroup>
  </div>
);
