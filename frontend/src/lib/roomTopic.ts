import { BookOpen, Coffee, Gamepad2, Globe2, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";
import type { RoomTopic } from "../types/realtime";

export const topicBackgrounds: Array<{ value: RoomTopic["background"]; swatch: string; banner: string }> = [
  { value: "slate", swatch: "bg-slate-500", banner: "border-slate-300/20 bg-slate-500/15" },
  { value: "mint", swatch: "bg-emerald-400", banner: "border-emerald-300/25 bg-emerald-400/15" },
  { value: "blue", swatch: "bg-blue-400", banner: "border-blue-300/25 bg-blue-500/15" },
  { value: "coral", swatch: "bg-orange-400", banner: "border-orange-300/25 bg-orange-500/15" },
  { value: "violet", swatch: "bg-violet-400", banner: "border-violet-300/25 bg-violet-500/15" },
  { value: "amber", swatch: "bg-amber-400", banner: "border-amber-300/25 bg-amber-400/15" }
];

export const topicFonts: Array<{ value: RoomTopic["font"]; className: string }> = [
  { value: "sans", className: "font-sans" },
  { value: "serif", className: "font-serif" },
  { value: "mono", className: "font-mono" },
  { value: "display", className: "font-sans font-semibold tracking-wide" }
];

export const topicIcons: Array<{ value: RoomTopic["icon"]; Icon: LucideIcon }> = [
  { value: "message", Icon: MessageCircle }, { value: "sparkles", Icon: Sparkles }, { value: "book", Icon: BookOpen },
  { value: "globe", Icon: Globe2 }, { value: "coffee", Icon: Coffee }, { value: "game", Icon: Gamepad2 }
];

export const getTopicBackground = (value: RoomTopic["background"]) => topicBackgrounds.find((item) => item.value === value)?.banner ?? topicBackgrounds[0].banner;
export const getTopicFont = (value: RoomTopic["font"]) => topicFonts.find((item) => item.value === value)?.className ?? topicFonts[0].className;
export const getTopicIcon = (value: RoomTopic["icon"]) => topicIcons.find((item) => item.value === value)?.Icon ?? MessageCircle;
