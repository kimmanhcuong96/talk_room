import { useEffect, useState } from "react";

export function useSpeaking(stream: MediaStream | null, micEnabled: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const audioTracks = stream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];

    if (!stream || !micEnabled || audioTracks.length === 0) {
      setIsSpeaking(false);
      setLevel(0);
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    let frameId = 0;
    let smoothedLevel = 0;
    let speakingState = false;
    let activeFrames = 0;

    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;
    const samples = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    void audioContext.resume();

    const tick = () => {
      analyser.getByteTimeDomainData(samples);

      let sumSquares = 0;
      for (const sample of samples) {
        const centered = (sample - 128) / 128;
        sumSquares += centered * centered;
      }

      const rms = Math.sqrt(sumSquares / samples.length);
      const nextLevel = Math.min(1, Math.max(0, (rms - 0.024) / 0.12));
      smoothedLevel = smoothedLevel * 0.72 + nextLevel * 0.28;
      activeFrames = smoothedLevel > 0.18 ? Math.min(activeFrames + 1, 6) : Math.max(activeFrames - 1, 0);
      speakingState = speakingState ? smoothedLevel > 0.09 || activeFrames >= 2 : activeFrames >= 3;

      setLevel(smoothedLevel);
      setIsSpeaking(speakingState);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      source.disconnect();
      void audioContext.close();
    };
  }, [stream, micEnabled]);

  return { isSpeaking, level };
}
