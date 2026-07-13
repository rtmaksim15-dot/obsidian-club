import { ContentComposer } from "obsidian-club";

// Post composer. The type control only appears when more than one type is
// allowed; titled types (article/lecture/course/manifesto) reveal a title field.
export const MultipleTypes = () => (
  <div style={{ maxWidth: 560, padding: "1.5rem" }}>
    <ContentComposer allowedTypes={["post", "story", "article", "manifesto"]} />
  </div>
);

export const SingleType = () => (
  <div style={{ maxWidth: 560, padding: "1.5rem" }}>
    <ContentComposer allowedTypes={["post"]} />
  </div>
);
