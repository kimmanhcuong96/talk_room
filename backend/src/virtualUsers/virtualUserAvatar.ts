const defaultAvatars = ["🐣", "🐼", "🐰", "🦊", "🐨", "🐥", "🐧", "🐸", "🦄", "🐙", "🐢", "🐹"] as const;

export function getVirtualUserAvatar(profile: { id: string; avatarUrl: string | null }) {
  if (profile.avatarUrl?.trim()) return profile.avatarUrl.trim();
  const numericId = Number.parseInt(profile.id.replace(/\D/g, ""), 10);
  return defaultAvatars[(Number.isFinite(numericId) ? numericId - 1 : 0) % defaultAvatars.length] ?? "🐣";
}
