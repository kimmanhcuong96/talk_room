type AvatarBadgeProps = {
  avatar: string;
  size?: "sm" | "md" | "lg" | "room";
};

const sizeClass = {
  sm: "h-7 w-7 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-24 w-24 text-5xl",
  room: "h-16 w-16 text-3xl"
};

function parseInitialAvatar(avatar: string) {
  const match = avatar.match(/^initials:([^:]+):(\d{1,3})$/);
  if (!match) return null;
  try {
    const initials = Array.from(decodeURIComponent(match[1] ?? "")).slice(0, 2).join("");
    if (!initials) return null;
    return { initials, hue: Math.min(359, Number(match[2] ?? 0)) };
  } catch {
    return null;
  }
}

export function AvatarBadge({ avatar, size = "md" }: AvatarBadgeProps) {
  const isImageUrl = /^(?:https?:\/\/|\/)/i.test(avatar);
  const initialAvatar = parseInitialAvatar(avatar);

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-mint/25 via-white/10 to-coral/25 shadow-inner ${sizeClass[size]}`}
      aria-hidden="true"
    >
      {isImageUrl ? (
        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : initialAvatar ? (
        <span
          className="grid h-full w-full place-items-center font-semibold text-white"
          style={{ background: `linear-gradient(145deg, hsl(${initialAvatar.hue} 64% 52%), hsl(${(initialAvatar.hue + 28) % 360} 58% 38%))` }}
        >
          {initialAvatar.initials}
        </span>
      ) : avatar}
    </span>
  );
}
