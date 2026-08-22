export const virtualUserGeneratedAvatars = {
  "bot-01": "initials:EM:12",
  "bot-02": "initials:JA:150",
  "bot-03": "initials:SO:287",
  "bot-04": "initials:NO:65",
  "bot-05": "/avatars/bot-scenes/virtual-01.svg",
  "bot-06": "initials:LE:340",
  "bot-07": "initials:LI:117",
  "bot-08": "initials:OL:255",
  "bot-09": "initials:AV:32",
  "bot-10": "/avatars/bot-scenes/virtual-02.svg",
  "bot-11": "initials:HA:307",
  "bot-12": "initials:KA:85",
  "bot-13": "initials:GR:222",
  "bot-14": "initials:BE:0",
  "bot-15": "/avatars/bot-scenes/virtual-03.svg"
} as const;

export function getGeneratedVirtualUserAvatar(virtualUserId: string) {
  return virtualUserGeneratedAvatars[virtualUserId as keyof typeof virtualUserGeneratedAvatars]
    ?? virtualUserGeneratedAvatars["bot-01"];
}
