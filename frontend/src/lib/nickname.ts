const GENERATED_NICKNAME_PATTERN = /^Talking User \d+$/;

export function isGeneratedNickname(nickname: string) {
  return GENERATED_NICKNAME_PATTERN.test(nickname.trim());
}

export function resolveGuestNickname(nickname: string, suggestedNickname: string) {
  const cleanNickname = nickname.trim();
  return !cleanNickname || isGeneratedNickname(cleanNickname) ? suggestedNickname : cleanNickname;
}
