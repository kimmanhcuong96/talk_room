import { type Language, translate } from "../lib/i18n";
import type { RoomParticipantSummary } from "../types/realtime";
import { AvatarBadge } from "./AvatarBadge";

function getRoleLabel(participant: RoomParticipantSummary, language: Language) {
  const key = participant.role === "supporter"
    ? "roleSupporter"
    : participant.role === "verified"
      ? "roleVerified"
      : "roleUnverified";
  return translate(language, key);
}

export function RoomParticipantAvatars({ participants, language }: { participants: RoomParticipantSummary[]; language: Language }) {
  if (participants.length === 0) return null;

  return (
    <div className="flex -space-x-2" aria-label={`${participants.length} participants`}>
      {participants.map((participant, index) => {
        const roleLabel = getRoleLabel(participant, language);
        return (
          <div key={`${participant.nickname}-${index}`} className="group relative transition hover:z-20 focus-within:z-20">
            <button
              type="button"
              aria-label={`${participant.nickname}, ${roleLabel}`}
              className="block rounded-full outline-none ring-mint transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
            >
              <AvatarBadge avatar={participant.avatar} size="sm" />
            </button>
            <div
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-2 w-max max-w-56 translate-y-1 rounded-md border border-white/10 bg-[#0b1622] px-3 py-2 opacity-0 shadow-xl shadow-black/35 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
            >
              <p className="max-w-48 truncate text-sm font-semibold text-white">{participant.nickname}</p>
              <p className="mt-0.5 text-xs text-white/55">{roleLabel}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
