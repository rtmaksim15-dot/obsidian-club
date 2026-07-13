import { ReviewForm } from "obsidian-club";

// Leave a rating + comment on another member. Owns its own state
// (rating stars, submitting, submitted).
export const Default = () => (
  <div style={{ maxWidth: 480, padding: "1.5rem" }}>
    <ReviewForm reviewedId="member-42" />
  </div>
);
