import { AvatarUploadButton } from "obsidian-club";

// Uploadthing-backed "Change avatar" button, styled as a secondary button.
// Inert without UPLOADTHING_* env; renders its control regardless.
export const Default = () => (
  <div style={{ padding: "1.5rem" }}>
    <AvatarUploadButton />
  </div>
);
