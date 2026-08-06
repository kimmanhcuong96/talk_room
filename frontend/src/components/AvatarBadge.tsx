type AvatarBadgeProps = {
  avatar: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-7 w-7 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-24 w-24 text-5xl"
};

export function AvatarBadge({ avatar, size = "md" }: AvatarBadgeProps) {
  const isImageUrl = /^https?:\/\//i.test(avatar);

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-mint/25 via-white/10 to-coral/25 shadow-inner ${sizeClass[size]}`}
      aria-hidden="true"
    >
      {isImageUrl ? (
        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : avatar}
    </span>
  );
}
