import { useEffect, useState } from "react";
import type { AppSocket } from "../lib/socket";
import { defaultRooms } from "../lib/rooms";
import type { RoomSummary } from "../types/realtime";

export function useRooms(socket: AppSocket) {
  const [rooms, setRooms] = useState<RoomSummary[]>(defaultRooms);

  useEffect(() => {
    socket.on("room-list", setRooms);
    return () => {
      socket.off("room-list", setRooms);
    };
  }, [socket]);

  return rooms;
}
