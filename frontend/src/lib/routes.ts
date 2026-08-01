export function getRoomIdFromPath(pathname = window.location.pathname) {
  const match = pathname.match(/^\/room\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function roomPath(roomId: string) {
  return `/room/${roomId}`;
}
