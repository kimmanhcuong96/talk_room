function getBasePath() {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function stripBasePath(pathname: string) {
  const basePath = getBasePath();

  if (!basePath || basePath === "/" || !pathname.startsWith(basePath)) {
    return pathname;
  }

  return pathname.slice(basePath.length) || "/";
}

export function getRoomIdFromPath(pathname = window.location.pathname) {
  const match = stripBasePath(pathname).match(/^\/room\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function homePath() {
  return `${getBasePath() || ""}/`;
}

export function roomPath(roomId: string) {
  return `${getBasePath() || ""}/room/${roomId}`;
}
