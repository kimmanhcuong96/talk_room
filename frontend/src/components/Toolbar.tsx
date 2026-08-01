import { LogOut, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { IconButton } from "./IconButton";

type ToolbarProps = {
  micEnabled: boolean;
  cameraEnabled: boolean;
  canToggleMic: boolean;
  canToggleCamera: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
};

export function Toolbar({
  micEnabled,
  cameraEnabled,
  canToggleMic,
  canToggleCamera,
  onToggleMic,
  onToggleCamera,
  onLeave
}: ToolbarProps) {
  return (
    <div className="relative z-20 flex items-center justify-center gap-3 border-t border-white/10 bg-ink/95 px-4 py-3">
      <IconButton
        label={canToggleMic ? (micEnabled ? "Mute microphone" : "Unmute microphone") : "No microphone found"}
        active={micEnabled}
        disabled={!canToggleMic}
        onClick={onToggleMic}
      >
        {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
      </IconButton>
      <IconButton
        label={canToggleCamera ? (cameraEnabled ? "Turn camera off" : "Turn camera on") : "No camera found"}
        active={cameraEnabled}
        disabled={!canToggleCamera}
        onClick={onToggleCamera}
      >
        {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </IconButton>
      <IconButton label="Leave room" danger onClick={onLeave}>
        <LogOut size={20} />
      </IconButton>
    </div>
  );
}
