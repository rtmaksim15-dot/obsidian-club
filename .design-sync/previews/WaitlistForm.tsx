import { WaitlistForm } from "obsidian-club";

// The public application/waitlist form on the landing page. No props — it owns
// its own submission state (idle → submitting → success/error).
export const Default = () => (
  <div style={{ maxWidth: 480, padding: "1.5rem" }}>
    <WaitlistForm />
  </div>
);
