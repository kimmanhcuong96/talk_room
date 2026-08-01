const fallbackAvatars = ["🐣", "🐼", "🐰", "🦊", "🐨", "🐥", "🐧", "🐸", "🦄", "🐙", "🐢", "🐹"];

export function getFallbackAvatar(seed: string) {
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackAvatars[hash % fallbackAvatars.length] ?? "🐣";
}
