import { useCallback, useEffect, useState } from "react";
import type { TranslationKey } from "../lib/i18n";

function hasDisplayMediaApi() {
  return (
    "mediaDevices" in navigator &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}

export function useScreenShare() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const isScreenSharing = Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live"));
  const canShareScreen = hasDisplayMediaApi();

  const stopScreenShare = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => {
        track.stop();
      });
      return null;
    });
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!hasDisplayMediaApi()) {
      setErrorKey("screenShareUnavailable");
      return false;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      displayStream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", stopScreenShare, { once: true });
      });
      setErrorKey(null);
      setStream(displayStream);
      return true;
    } catch {
      setErrorKey("screenShareStartFailed");
      return false;
    }
  }, [stopScreenShare]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return false;
    }

    return startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  useEffect(() => stopScreenShare, [stopScreenShare]);

  return { stream, errorKey, isScreenSharing, canShareScreen, toggleScreenShare, stopScreenShare };
}
