import { useEffect, useMemo, useState } from "react";
import { createSocket } from "../lib/socket";

export function useSocket() {
  const socket = useMemo(() => createSocket(), []);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setConnectionError(error.message || "Could not connect to the server.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    };
  }, [socket]);

  return { socket, isConnected, connectionError };
}
