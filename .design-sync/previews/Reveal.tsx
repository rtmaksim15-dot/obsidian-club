import { Reveal } from "obsidian-club";

// Scroll-triggered fade-in wrapper (opacity + translateY over 700ms) used
// throughout the landing page. Shown here fully revealed.
export const FadesIn = () => (
  <div style={{ maxWidth: 480, padding: "1.5rem" }}>
    <Reveal className="card">
      <p className="text-h2 !text-lg">The Hall</p>
      <p className="text-body mt-2">
        Content wrapped in Reveal rises and fades into place as it enters the
        viewport — slow, deliberate, never bouncy.
      </p>
    </Reveal>
  </div>
);
