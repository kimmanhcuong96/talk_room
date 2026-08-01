import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
};

export function IconButton({ label, active = false, danger = false, children, className = "", ...props }: IconButtonProps) {
  const disabled = Boolean(props.disabled);
  const tone = disabled
    ? "cursor-not-allowed border-white/5 bg-white/[0.03] text-white/25"
    : danger
    ? "border-coral/40 bg-coral/15 text-coral hover:bg-coral/25"
    : active
      ? "border-mint/50 bg-mint/15 text-mint hover:bg-mint/20"
      : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10";

  return (
    <button
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-md border transition ${tone} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
