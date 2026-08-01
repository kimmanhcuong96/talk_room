import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSpeaking } from "../hooks/useSpeaking";
import { type Language, translate } from "../lib/i18n";
import { AvatarBadge } from "./AvatarBadge";

type VideoTileProps = {
  stream: MediaStream | null;
  nickname: string;
  avatar: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing?: boolean;
  language: Language;
  muted?: boolean;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

export function VideoTile({
  stream,
  nickname,
  avatar,
  micEnabled,
  cameraEnabled,
  screenSharing = false,
  language,
  muted = false,
  compact = false,
  selected = false,
  onClick
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { isSpeaking, level } = useSpeaking(stream, micEnabled);
  const hasLiveVideo = stream?.getVideoTracks().some((track) => track.readyState === "live") ?? false;

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraEnabled, stream]);

  const barLevels = [0.45, 0.75, 1];
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      aria-label={onClick ? `Focus ${nickname}` : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onClick();
      }}
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-lg border bg-black transition ${
        onClick ? "cursor-pointer outline-none hover:border-[#258ff4]/80 focus-visible:border-[#258ff4] focus-visible:ring-2 focus-visible:ring-[#258ff4]/35" : ""
      } ${
        selected
          ? "border-[#258ff4] shadow-[0_0_28px_rgba(37,143,244,0.28)]"
          : isSpeaking
            ? "border-mint shadow-glow"
            : "border-white/10"
      }`}
    >
      {stream && cameraEnabled && hasLiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full object-cover ${screenSharing ? "" : "scale-x-[-1]"}`}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-field">
          <div className="relative">
            <AvatarBadge avatar={avatar} size={compact ? "md" : "lg"} />
            {isSpeaking ? (
              <span className="absolute -inset-2 rounded-full border-2 border-mint opacity-80 animate-ping" />
            ) : null}
          </div>
        </div>
      )}

      {isSpeaking && !compact ? (
        <div className="absolute left-3 top-3 rounded-md border border-mint/50 bg-mint/15 px-2 py-1 text-xs font-semibold text-mint">
          {t("speaking")}
        </div>
      ) : null}

      <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 backdrop-blur ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
        <span className="flex min-w-0 items-center gap-2">
          {compact ? null : <AvatarBadge avatar={avatar} size="sm" />}
          <span className={`${compact ? "text-xs" : "text-sm"} truncate font-medium text-white`}>{nickname}</span>
        </span>
        <span className={`flex shrink-0 items-center ${compact ? "gap-1" : "gap-2"} text-white/80`}>
          <span className="flex items-center gap-1">
            {micEnabled ? <Mic size={compact ? 13 : 16} className={isSpeaking ? "text-mint" : undefined} /> : <MicOff size={compact ? 13 : 16} />}
            {micEnabled && !compact ? (
              <span className="flex h-4 items-end gap-0.5" aria-label={isSpeaking ? t("speaking") : t("micUnmute")}>
                {barLevels.map((barLevel) => {
                  const height = Math.max(3, Math.round(16 * Math.min(1, level / barLevel)));
                  return (
                    <span
                      key={barLevel}
                      className={`w-1 rounded-full transition-all duration-75 ${isSpeaking ? "bg-mint" : "bg-white/30"}`}
                      style={{ height }}
                    />
                  );
                })}
              </span>
            ) : null}
          </span>
          {cameraEnabled ? <Video size={compact ? 13 : 16} /> : <VideoOff size={compact ? 13 : 16} />}
        </span>
      </div>
    </div>
  );
}
