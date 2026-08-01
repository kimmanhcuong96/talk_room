import type { RoomUser } from "../types/realtime";
import { VideoTile } from "./VideoTile";

type RemotePeer = RoomUser & {
  stream: MediaStream | null;
};

type VideoGridProps = {
  localStream: MediaStream | null;
  localUser: {
    nickname: string;
    avatar: string;
    micEnabled: boolean;
    cameraEnabled: boolean;
  };
  remotePeers: RemotePeer[];
};

export function VideoGrid({ localStream, localUser, remotePeers }: VideoGridProps) {
  const totalUsers = remotePeers.length + 1;
  const participants = [
    {
      id: "local",
      stream: localStream,
      nickname: `${localUser.nickname} (You)`,
      avatar: localUser.avatar,
      micEnabled: localUser.micEnabled,
      cameraEnabled: localUser.cameraEnabled,
      muted: true
    },
    ...remotePeers.map((peer) => ({
      id: peer.socketId,
      stream: peer.stream,
      nickname: peer.nickname,
      avatar: peer.avatar,
      micEnabled: peer.micEnabled,
      cameraEnabled: peer.cameraEnabled,
      muted: false
    }))
  ];

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
            muted
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
            muted={participant.muted}
          />
        </div>
      ))}
    </div>
  );
}
