import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSpeaking } from "../hooks/useSpeaking";
import { AvatarBadge } from "./AvatarBadge";

type VideoTileProps = {
  stream: MediaStream | null;
  nickname: string;
  avatar: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  muted?: boolean;
};

export function VideoTile({ stream, nickname, avatar, micEnabled, cameraEnabled, muted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { isSpeaking, level } = useSpeaking(stream, micEnabled);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraEnabled, stream]);

  const barLevels = [0.45, 0.75, 1];

  return (
    <div
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-lg border bg-black transition ${
        isSpeaking ? "border-mint shadow-glow" : "border-white/10"
      }`}
    >
      {stream && cameraEnabled ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full scale-x-[-1] object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-field">
          <div className="relative">
            <AvatarBadge avatar={avatar} size="lg" />
            {isSpeaking ? (
              <span className="absolute -inset-2 rounded-full border-2 border-mint opacity-80 animate-ping" />
            ) : null}
          </div>
        </div>
      )}

      {isSpeaking ? (
        <div className="absolute left-3 top-3 rounded-md border border-mint/50 bg-mint/15 px-2 py-1 text-xs font-semibold text-mint">
          Speaking
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-3 py-2 backdrop-blur">
        <span className="flex min-w-0 items-center gap-2">
          <AvatarBadge avatar={avatar} size="sm" />
          <span className="truncate text-sm font-medium text-white">{nickname}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-white/80">
          <span className="flex items-center gap-1">
            {micEnabled ? <Mic size={16} className={isSpeaking ? "text-mint" : undefined} /> : <MicOff size={16} />}
            {micEnabled ? (
              <span className="flex h-4 items-end gap-0.5" aria-label={isSpeaking ? "Speaking" : "Microphone on"}>
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
          {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
        </span>
      </div>
    </div>
  );
}
