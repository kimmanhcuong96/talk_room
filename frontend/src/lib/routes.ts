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
export type AdminPage = "dashboard" | "users" | "admins" | "reports" | "verification-requests" | "virtual-users" | "analytics" | "llm-usage";

export function getAdminPageFromPath(pathname = window.location.pathname): AdminPage | null {
  const path = stripBasePath(pathname);
  if (/^\/admin\/?$/.test(path)) return "dashboard";
  const match = path.match(/^\/admin\/(users|admins|reports|verification-requests|virtual-users|analytics|llm-usage)\/?$/);
  return (match?.[1] as AdminPage | undefined) ?? null;
}

export function getInfoPageFromPath(pathname = window.location.pathname): InfoPage | null {
  const match = stripBasePath(pathname).match(/^\/(privacy|contact|about)\/?$/);
  return (match?.[1] as InfoPage | undefined) ?? null;
}

export function getRoomIdFromPath(pathname = window.location.pathname) {
  const match = stripBasePath(pathname).match(/^\/room\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function isKnownClientPath(pathname = window.location.pathname) {
  const path = stripBasePath(pathname);
  return /^\/?$/.test(path)
    || /^\/room\/[^/]+\/?$/.test(path)
    || /^\/(privacy|contact|about)\/?$/.test(path)
    || /^\/admin(?:\/(users|admins|reports|verification-requests|virtual-users|analytics|llm-usage))?\/?$/.test(path);
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

export function adminPath(page: AdminPage = "dashboard") {
  const suffix = page === "dashboard" ? "" : `/${page}`;
  return `${getBasePath() || ""}/admin${suffix}`;
}
