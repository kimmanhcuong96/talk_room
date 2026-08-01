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
  return (
    <div className="grid h-full content-center gap-3 md:grid-cols-2">
      <VideoTile
        stream={localStream}
        nickname={`${localUser.nickname} (You)`}
        avatar={localUser.avatar}
        micEnabled={localUser.micEnabled}
        cameraEnabled={localUser.cameraEnabled}
        muted
      />
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.socketId}
          stream={peer.stream}
          nickname={peer.nickname}
          avatar={peer.avatar}
          micEnabled={peer.micEnabled}
          cameraEnabled={peer.cameraEnabled}
        />
      ))}
    </div>
  );
}
