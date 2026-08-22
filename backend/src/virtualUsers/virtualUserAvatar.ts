import { getGeneratedVirtualUserAvatar } from "./virtualUserAvatars.js";

export function getVirtualUserAvatar(profile: { id: string; avatarUrl: string | null }) {
  if (profile.avatarUrl?.trim()) return profile.avatarUrl.trim();
  return getGeneratedVirtualUserAvatar(profile.id);
}
