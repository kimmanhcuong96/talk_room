import { Crown, LogOut, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type Language, translate } from "../lib/i18n";
import { IconButton } from "./IconButton";

type ToolbarProps = {
  micEnabled: boolean;
  cameraEnabled: boolean;
  canToggleMic: boolean;
  canToggleCamera: boolean;
  cameraRestricted: boolean;
  language: Language;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
  onOpenVerificationRequest: () => void;
  canRequestVerification: boolean;
};

export function Toolbar({
  micEnabled,
  cameraEnabled,
  canToggleMic,
  canToggleCamera,
  cameraRestricted,
  language,
  onToggleMic,
  onToggleCamera,
  onLeave,
  onOpenVerificationRequest,
  canRequestVerification
}: ToolbarProps) {
  const [cameraPopoverOpen, setCameraPopoverOpen] = useState(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    if (!cameraRestricted) setCameraPopoverOpen(false);
  }, [cameraRestricted]);

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
      <div className="relative">
        {cameraPopoverOpen ? (
          <div role="dialog" aria-label={t("cameraUpgradeTitle")} className="absolute bottom-full left-1/2 z-40 mb-3 w-72 -translate-x-1/2 rounded-lg border border-reward/30 bg-panel p-4 text-left shadow-2xl shadow-black/45">
            <button type="button" aria-label={t("closeUpgradeGuide")} onClick={() => setCameraPopoverOpen(false)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-white/45 hover:bg-white/8 hover:text-white"><X size={15} /></button>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-reward/15 text-reward"><Crown size={18} /></span>
            <h3 className="mt-3 pr-6 text-sm font-semibold text-white">{t("cameraUpgradeTitle")}</h3>
            <p className="mt-2 text-xs leading-5 text-white/60">{t("cameraUpgradeDescription")}</p>
            {canRequestVerification ? <button type="button" onClick={onOpenVerificationRequest} className="mt-3 h-9 w-full rounded-md border border-mint/35 bg-mint/10 px-3 text-xs font-semibold text-mint hover:bg-mint/20">{t("requestVerification")}</button> : null}
            <button type="button" onClick={() => setCameraPopoverOpen(false)} className="mt-4 h-9 w-full rounded-md bg-mint px-3 text-xs font-semibold text-ink hover:bg-mint/90">{t("gotIt")}</button>
            <span aria-hidden="true" className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-reward/30 bg-panel" />
          </div>
        ) : null}
        <IconButton
          label={cameraEnabled ? t("videoOff") : canToggleCamera || cameraRestricted ? t("videoOn") : t("videoUnavailable")}
          active={cameraEnabled}
          disabled={!cameraRestricted && !canToggleCamera}
          aria-expanded={cameraRestricted ? cameraPopoverOpen : undefined}
          onClick={cameraRestricted ? () => setCameraPopoverOpen((open) => !open) : onToggleCamera}
        >
          {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </IconButton>
      </div>
      <IconButton label={t("leaveRoom")} danger onClick={onLeave}>
        <LogOut size={20} />
      </IconButton>
    </div>
  );
}
