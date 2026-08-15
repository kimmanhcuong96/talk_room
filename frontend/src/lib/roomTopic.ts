import { BookOpen, CircleOff, Coffee, Gamepad2, Globe2, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";
import type { RoomTopic } from "../types/realtime";

export const topicBackgrounds: Array<{ value: RoomTopic["background"]; swatch: string; banner: string; image?: string }> = [
  { value: "slate", swatch: "bg-slate-500", banner: "border-slate-300/20 bg-slate-500/15" },
  { value: "mint", swatch: "bg-emerald-400", banner: "border-emerald-300/25 bg-emerald-400/15" },
  { value: "blue", swatch: "bg-blue-400", banner: "border-blue-300/25 bg-blue-500/15" },
  { value: "coral", swatch: "bg-orange-400", banner: "border-orange-300/25 bg-orange-500/15" },
  { value: "violet", swatch: "bg-violet-400", banner: "border-violet-300/25 bg-violet-500/15" },
  { value: "amber", swatch: "bg-amber-400", banner: "border-amber-300/25 bg-amber-400/15" },
  { value: "aurora", swatch: "bg-[url('/topic-backgrounds/aurora.svg')] bg-cover bg-center", banner: "border-cyan-200/30 bg-slate-900", image: "/topic-backgrounds/aurora.svg" },
  { value: "sunset", swatch: "bg-[url('/topic-backgrounds/sunset.svg')] bg-cover bg-center", banner: "border-orange-200/30 bg-slate-900", image: "/topic-backgrounds/sunset.svg" },
  { value: "ocean", swatch: "bg-[url('/topic-backgrounds/ocean.svg')] bg-cover bg-center", banner: "border-sky-200/30 bg-slate-900", image: "/topic-backgrounds/ocean.svg" },
  { value: "nebula", swatch: "bg-[url('/topic-backgrounds/nebula.svg')] bg-cover bg-center", banner: "border-fuchsia-200/30 bg-slate-900", image: "/topic-backgrounds/nebula.svg" },
  { value: "prism", swatch: "bg-[url('/topic-backgrounds/prism.svg')] bg-cover bg-center", banner: "border-cyan-200/30 bg-slate-900", image: "/topic-backgrounds/prism.svg" },
  { value: "geometry", swatch: "bg-[url('/topic-backgrounds/geometry.svg')] bg-cover bg-center", banner: "border-teal-200/30 bg-slate-900", image: "/topic-backgrounds/geometry.svg" },
  { value: "fluid", swatch: "bg-[url('/topic-backgrounds/fluid.svg')] bg-cover bg-center", banner: "border-fuchsia-200/30 bg-slate-900", image: "/topic-backgrounds/fluid.svg" },
  { value: "forest", swatch: "bg-[url('/topic-backgrounds/forest.svg')] bg-cover bg-center", banner: "border-emerald-200/30 bg-slate-900", image: "/topic-backgrounds/forest.svg" },
  { value: "particles", swatch: "bg-[url('/topic-backgrounds/particles.svg')] bg-cover bg-center", banner: "border-zinc-200/30 bg-slate-900", image: "/topic-backgrounds/particles.svg" },
  { value: "holographic", swatch: "bg-[url('/topic-backgrounds/holographic.svg')] bg-cover bg-center", banner: "border-pink-200/30 bg-slate-900", image: "/topic-backgrounds/holographic.svg" },
  { value: "neon-grid", swatch: "bg-[url('/topic-backgrounds/neon-grid.svg')] bg-cover bg-center", banner: "border-cyan-200/30 bg-slate-900", image: "/topic-backgrounds/neon-grid.svg" },
  { value: "synthwave", swatch: "bg-[url('/topic-backgrounds/synthwave.svg')] bg-cover bg-center", banner: "border-yellow-200/30 bg-slate-900", image: "/topic-backgrounds/synthwave.svg" },
  { value: "circuit", swatch: "bg-[url('/topic-backgrounds/circuit.svg')] bg-cover bg-center", banner: "border-lime-200/30 bg-slate-900", image: "/topic-backgrounds/circuit.svg" },
  { value: "glass-orbs", swatch: "bg-[url('/topic-backgrounds/glass-orbs.svg')] bg-cover bg-center", banner: "border-sky-200/30 bg-slate-900", image: "/topic-backgrounds/glass-orbs.svg" },
  { value: "mesh", swatch: "bg-[url('/topic-backgrounds/mesh.svg')] bg-cover bg-center", banner: "border-orange-200/30 bg-slate-900", image: "/topic-backgrounds/mesh.svg" },
  { value: "data-stream", swatch: "bg-[url('/topic-backgrounds/data-stream.svg')] bg-cover bg-center", banner: "border-blue-200/30 bg-slate-900", image: "/topic-backgrounds/data-stream.svg" }
];

export const topicFonts: Array<{ value: RoomTopic["font"]; className: string }> = [
  { value: "sans", className: "font-sans" },
  { value: "serif", className: "font-serif" },
  { value: "mono", className: "font-mono" },
  { value: "display", className: "font-sans font-semibold tracking-wide" }
];

export const topicIcons: Array<{ value: RoomTopic["icon"]; Icon: LucideIcon }> = [
  { value: "none", Icon: CircleOff }, { value: "message", Icon: MessageCircle }, { value: "sparkles", Icon: Sparkles }, { value: "book", Icon: BookOpen },
  { value: "globe", Icon: Globe2 }, { value: "coffee", Icon: Coffee }, { value: "game", Icon: Gamepad2 }
];

export const getTopicBackground = (value: RoomTopic["background"]) => topicBackgrounds.find((item) => item.value === value)?.banner ?? topicBackgrounds[0].banner;
export const getTopicBackgroundImage = (value: RoomTopic["background"]) => topicBackgrounds.find((item) => item.value === value)?.image;
export const getTopicFont = (value: RoomTopic["font"]) => topicFonts.find((item) => item.value === value)?.className ?? topicFonts[0].className;
export const getTopicIcon = (value: RoomTopic["icon"]) => value === "none" ? null : topicIcons.find((item) => item.value === value)?.Icon ?? MessageCircle;
