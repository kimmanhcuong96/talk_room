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

export type InfoPage = "privacy" | "contact" | "about";

export function getInfoPageFromPath(pathname = window.location.pathname): InfoPage | null {
  const match = stripBasePath(pathname).match(/^\/(privacy|contact|about)\/?$/);
  return (match?.[1] as InfoPage | undefined) ?? null;
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

export function infoPagePath(page: InfoPage) {
  return `${getBasePath() || ""}/${page}`;
}
