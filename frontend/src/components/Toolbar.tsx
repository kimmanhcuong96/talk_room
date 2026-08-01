import { LogOut, Mic, MicOff, ScreenShare, ScreenShareOff, Video, VideoOff } from "lucide-react";
import { type Language, translate } from "../lib/i18n";
import { IconButton } from "./IconButton";

type ToolbarProps = {
  micEnabled: boolean;
  cameraEnabled: boolean;
  canToggleMic: boolean;
  canToggleCamera: boolean;
  canShareScreen: boolean;
  screenShareSupported: boolean;
  screenSharing: boolean;
  language: Language;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
};

export function Toolbar({
  micEnabled,
  cameraEnabled,
  canToggleMic,
  canToggleCamera,
  canShareScreen,
  screenShareSupported,
  screenSharing,
  language,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave
}: ToolbarProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  return (
    <div className="relative z-20 flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-ink/95 px-3 py-2 sm:px-4 sm:py-3">
      <IconButton
        label={canToggleMic ? (micEnabled ? t("micMute") : t("micUnmute")) : t("micUnavailable")}
        active={micEnabled}
        disabled={!canToggleMic}
        onClick={onToggleMic}
      >
        {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
      </IconButton>
      <IconButton
        label={canToggleCamera ? (cameraEnabled ? t("videoOff") : t("videoOn")) : t("videoUnavailable")}
        active={cameraEnabled}
        disabled={!canToggleCamera}
        onClick={onToggleCamera}
      >
        {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </IconButton>
      <IconButton
        label={screenShareSupported ? (screenSharing ? t("screenShareOff") : t("screenShareOn")) : t("screenShareUnavailable")}
        active={screenSharing}
        disabled={!canShareScreen}
        onClick={onToggleScreenShare}
      >
        {screenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
      </IconButton>
      <IconButton label={t("leaveRoom")} danger onClick={onLeave}>
        <LogOut size={20} />
      </IconButton>
    </div>
  );
}
