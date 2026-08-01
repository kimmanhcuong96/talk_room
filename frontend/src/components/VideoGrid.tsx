import type { RoomUser } from "../types/realtime";
import type { Language } from "../lib/i18n";
import { VideoTile } from "./VideoTile";
import { useEffect, useMemo, useState } from "react";

type RemotePeer = RoomUser & {
  stream: MediaStream | null;
};

type VideoGridProps = {
  localStream: MediaStream | null;
  localCameraStream: MediaStream | null;
  localUser: {
    nickname: string;
    avatar: string;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
  };
  language: Language;
  remotePeers: RemotePeer[];
};

type Participant = {
  id: string;
  stream: MediaStream | null;
  thumbnailStream: MediaStream | null;
  nickname: string;
  avatar: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  muted: boolean;
};

function createPreviewStream(source: MediaStream | null, screenSharing: boolean, mode: "stage" | "thumbnail") {
  if (!source) {
    return null;
  }

  const audioTracks = source.getAudioTracks();
  const videoTracks = source.getVideoTracks().filter((track) => track.readyState === "live");
  const videoTrack = (() => {
    if (mode === "stage") {
      return screenSharing ? videoTracks.at(-1) : videoTracks[0];
    }

    if (screenSharing) {
      return videoTracks.length > 1 ? videoTracks[0] : undefined;
    }

    return videoTracks[0];
  })();

  return new MediaStream([...audioTracks, ...(videoTrack ? [videoTrack] : [])]);
}

type ParticipantVideoTileProps = {
  participant: Participant;
  mode: "stage" | "thumbnail";
  language: Language;
  selected?: boolean;
  onClick: () => void;
};

function ParticipantVideoTile({ participant, mode, language, selected = false, onClick }: ParticipantVideoTileProps) {
  const sourceStream = mode === "thumbnail" ? participant.thumbnailStream : participant.stream;
  const previewStream = useMemo(
    () => createPreviewStream(sourceStream, participant.screenSharing, mode),
    [mode, participant.screenSharing, sourceStream]
  );

  return (
    <VideoTile
      stream={previewStream}
      nickname={participant.nickname}
      avatar={participant.avatar}
      micEnabled={participant.micEnabled}
      cameraEnabled={mode === "stage" ? participant.cameraEnabled || participant.screenSharing : participant.cameraEnabled}
      screenSharing={mode === "stage" ? participant.screenSharing : false}
      language={language}
      muted={participant.muted || (mode === "thumbnail" && selected)}
      compact={mode === "thumbnail"}
      selected={selected}
      onClick={onClick}
    />
  );
}

export function VideoGrid({ localStream, localCameraStream, localUser, language, remotePeers }: VideoGridProps) {
  const [featuredParticipantId, setFeaturedParticipantId] = useState<string | null>(null);
  const totalUsers = remotePeers.length + 1;
  const participants = useMemo(
    () => [
      {
        id: "local",
        stream: localStream,
        thumbnailStream: localCameraStream,
        nickname: `${localUser.nickname} (You)`,
        avatar: localUser.avatar,
        micEnabled: localUser.micEnabled,
        cameraEnabled: localUser.cameraEnabled,
        screenSharing: localUser.screenSharing,
        muted: true
      },
      ...remotePeers.map((peer) => ({
        id: peer.socketId,
        stream: peer.stream,
        thumbnailStream: peer.stream,
        nickname: peer.nickname,
        avatar: peer.avatar,
        micEnabled: peer.micEnabled,
        cameraEnabled: peer.cameraEnabled,
        screenSharing: peer.screenSharing,
        muted: false
      }))
    ],
    [localCameraStream, localStream, localUser.avatar, localUser.cameraEnabled, localUser.micEnabled, localUser.nickname, localUser.screenSharing, remotePeers]
  );
  const featuredParticipant = participants.find((participant) => participant.id === featuredParticipantId);
  const thumbnailParticipants = featuredParticipant ? participants : [];

  useEffect(() => {
    const screenSharingParticipant = participants.find((participant) => participant.screenSharing);
    if (screenSharingParticipant) {
      setFeaturedParticipantId(screenSharingParticipant.id);
      return;
    }

    if (featuredParticipantId && !participants.some((participant) => participant.id === featuredParticipantId)) {
      setFeaturedParticipantId(null);
    }
  }, [featuredParticipantId, participants]);

  if (featuredParticipant) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
        <div className="min-h-0 flex-1">
          <ParticipantVideoTile
            participant={featuredParticipant}
            mode="stage"
            language={language}
            selected
            onClick={() => setFeaturedParticipantId(null)}
          />
        </div>

        {thumbnailParticipants.length > 0 ? (
          <div className="flex h-16 shrink-0 items-center justify-start gap-2 overflow-hidden sm:h-20 sm:gap-3">
            {thumbnailParticipants.map((participant) => (
              <div key={participant.id} className="h-full w-24 shrink-0 sm:w-28">
                <ParticipantVideoTile
                  participant={participant}
                  mode="thumbnail"
                  language={language}
                  selected={participant.id === featuredParticipant.id}
                  onClick={() => setFeaturedParticipantId(participant.id)}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (remotePeers.length === 0) {
    return (
      <div className="grid h-full min-h-0 place-items-center">
        <div className="h-full max-h-full w-full max-w-xs sm:max-h-[min(100%,42vw)] sm:max-w-3xl">
          <VideoTile
            stream={localStream}
            nickname={`${localUser.nickname} (You)`}
            avatar={localUser.avatar}
            micEnabled={localUser.micEnabled}
            cameraEnabled={localUser.cameraEnabled}
            screenSharing={localUser.screenSharing}
            language={language}
            muted
            onClick={() => setFeaturedParticipantId("local")}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid h-full min-h-0 gap-3 ${
        totalUsers === 2 ? "grid-rows-2 sm:grid-cols-2 sm:grid-rows-1" : "grid-cols-2 grid-rows-2"
      }`}
    >
      {participants.map((participant, index) => (
        <div
          key={participant.id}
          className={totalUsers === 3 && index === 2 ? "col-span-2 mx-auto h-full w-full max-w-[calc((100%_-_0.75rem)/2)]" : "min-h-0"}
        >
          <VideoTile
            stream={participant.stream}
            nickname={participant.nickname}
            avatar={participant.avatar}
            micEnabled={participant.micEnabled}
            cameraEnabled={participant.cameraEnabled}
            screenSharing={participant.screenSharing}
            language={language}
            muted={participant.muted}
            onClick={() => setFeaturedParticipantId(participant.id)}
          />
        </div>
      ))}
    </div>
  );
}
