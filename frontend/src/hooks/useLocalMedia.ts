import { useCallback, useEffect, useState } from "react";

function getLiveAudioTracks(stream: MediaStream | null) {
  return stream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];
}

function getLiveVideoTracks(stream: MediaStream | null) {
  return stream?.getVideoTracks().filter((track) => track.readyState === "live") ?? [];
}

function hasMediaDeviceApi() {
  return (
    "mediaDevices" in navigator &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof navigator.mediaDevices?.enumerateDevices === "function"
  );
}

async function hasInputDevice(kind: MediaDeviceKind) {
  if (!hasMediaDeviceApi()) {
    return false;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.some((device) => device.kind === kind);
}

async function requestLocalStream() {
  if (!hasMediaDeviceApi()) {
    throw new Error("Media devices are unavailable on this browser origin.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (combinedError) {
    const tracks: MediaStreamTrack[] = [];

    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      tracks.push(...audioOnly.getAudioTracks());
    } catch {
      // Missing or denied microphone should not block camera/avatar-only room entry.
    }

    try {
      const videoOnly = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      tracks.push(...videoOnly.getVideoTracks());
    } catch {
      // Missing or denied camera is fine because the app can show the avatar.
    }

    if (tracks.length > 0) {
      return new MediaStream(tracks);
    }

    throw combinedError;
  }
}

export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  const disableMicrophone = useCallback((message?: string) => {
    setMicEnabled(false);
    setHasMicrophone(false);
    if (message) {
      setError(message);
    }
  }, []);

  const disableCamera = useCallback((message?: string) => {
    setCameraEnabled(false);
    setHasCamera(false);
    if (message) {
      setError(message);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    requestLocalStream()
      .then((mediaStream) => {
        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);
        mediaStream.getTracks().forEach((track) => {
          track.enabled = false;
        });
        void hasInputDevice("audioinput").then((hasAudioInput) => {
          if (isMounted) {
            setHasMicrophone(hasAudioInput && getLiveAudioTracks(mediaStream).length > 0);
          }
        });
        void hasInputDevice("videoinput").then((hasVideoInput) => {
          if (isMounted) {
            setHasCamera(hasVideoInput && getLiveVideoTracks(mediaStream).length > 0);
          }
        });
      })
      .catch(() => {
        if (isMounted) {
          setHasMicrophone(false);
          setHasCamera(false);
          setError(
            hasMediaDeviceApi()
              ? "No camera or microphone is available. You can still stay in the room with your avatar."
              : "Camera and microphone need HTTPS or localhost. You can still stay in the room with your avatar."
          );
        }
      });

    return () => {
      isMounted = false;
      setStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (!stream) {
      return;
    }

    const handleAudioEnded = () => {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      disableMicrophone("Microphone was disconnected.");
    };

    const handleVideoEnded = () => {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      disableCamera("Camera was disconnected.");
    };

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    audioTracks.forEach((track) => {
      track.addEventListener("ended", handleAudioEnded);
    });
    videoTracks.forEach((track) => {
      track.addEventListener("ended", handleVideoEnded);
    });

    void hasInputDevice("audioinput").then((hasAudioInput) => {
      setHasMicrophone(hasAudioInput && getLiveAudioTracks(stream).length > 0);
    });
    void hasInputDevice("videoinput").then((hasVideoInput) => {
      setHasCamera(hasVideoInput && getLiveVideoTracks(stream).length > 0);
    });

    return () => {
      audioTracks.forEach((track) => {
        track.removeEventListener("ended", handleAudioEnded);
      });
      videoTracks.forEach((track) => {
        track.removeEventListener("ended", handleVideoEnded);
      });
    };
  }, [disableCamera, disableMicrophone, stream]);

  useEffect(() => {
    if (!hasMediaDeviceApi()) {
      disableMicrophone();
      disableCamera();
      return;
    }

    const handleDeviceChange = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some((device) => device.kind === "audioinput");
      const hasVideoInput = devices.some((device) => device.kind === "videoinput");

      if (!hasAudioInput || getLiveAudioTracks(stream).length === 0) {
        stream?.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        disableMicrophone(hasAudioInput ? undefined : "No microphone was found.");
      } else {
        setHasMicrophone(true);
      }

      if (!hasVideoInput || getLiveVideoTracks(stream).length === 0) {
        stream?.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        disableCamera(hasVideoInput ? undefined : "No camera was found.");
      } else {
        setHasCamera(true);
      }
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    void handleDeviceChange();

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [disableCamera, disableMicrophone, stream]);

  useEffect(() => {
    getLiveAudioTracks(stream).forEach((track) => {
      track.enabled = micEnabled;
    });
    getLiveVideoTracks(stream).forEach((track) => {
      track.enabled = cameraEnabled;
    });
  }, [cameraEnabled, micEnabled, stream]);

  const toggleMic = useCallback(async () => {
    const hasAudioInput = await hasInputDevice("audioinput");
    const audioTracks = getLiveAudioTracks(stream);
    if (!hasAudioInput || audioTracks.length === 0) {
      disableMicrophone("No microphone was found, so mic cannot be enabled.");
      return;
    }

    setHasMicrophone(true);

    setMicEnabled((enabled) => {
      const next = !enabled;
      audioTracks.forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, [disableMicrophone, stream]);

  const toggleCamera = useCallback(async () => {
    const hasVideoInput = await hasInputDevice("videoinput");
    const videoTracks = getLiveVideoTracks(stream);
    if (!hasVideoInput || videoTracks.length === 0) {
      disableCamera("No camera was found, so camera cannot be enabled.");
      return;
    }

    setHasCamera(true);

    setCameraEnabled((enabled) => {
      const next = !enabled;
      videoTracks.forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, [disableCamera, stream]);

  return { stream, error, micEnabled, cameraEnabled, hasMicrophone, hasCamera, toggleMic, toggleCamera };
}
