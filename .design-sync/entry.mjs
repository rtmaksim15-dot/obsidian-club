// design-sync bundle entry (passed via --entry).
//
// Obsidian Club has no library dist/; its components are Next.js app modules,
// each a `export default`. A synthesized `export *` entry would miss every
// default export, so this file re-exports each component under its name onto
// window.ObsidianClub. Reveal.tsx ships several named exports; NextNavProvider
// is the preview context wrapper (cfg.provider / cfg.extraEntries).

export { default as LikeButton } from "../components/shared/LikeButton.tsx";
export { default as WaitlistForm } from "../components/shared/WaitlistForm.tsx";
export { default as ComingSoon } from "../components/shared/ComingSoon.tsx";
export { default as PostList } from "../components/shared/PostList.tsx";
export { default as ApplicationsQueue } from "../components/shared/ApplicationsQueue.tsx";
export { default as ContentComposer } from "../components/shared/ContentComposer.tsx";
export { default as ReviewForm } from "../components/shared/ReviewForm.tsx";
export { default as ProfileEditForm } from "../components/shared/ProfileEditForm.tsx";
export { default as BottomNav } from "../components/shared/BottomNav.tsx";
export { default as RoomChat } from "../components/shared/RoomChat.tsx";
export { default as AvatarUploadButton } from "../components/shared/AvatarUploadButton.tsx";
export {
  Reveal,
  RevealGroup,
  RevealItem,
  RevealList,
  RevealListItem,
} from "../components/shared/Reveal.tsx";
export { NextNavProvider } from "./shims/next-nav-provider.tsx";
