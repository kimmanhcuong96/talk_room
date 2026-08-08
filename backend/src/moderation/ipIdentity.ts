import { createHmac } from "node:crypto";
import { env } from "../config/env.js";
import type { AppSocket } from "../types/socket.js";

function normalizeAddress(value: string) {
  const address = value.trim();
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

export function getSocketIpHash(socket: AppSocket) {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  const realIp = socket.handshake.headers["x-real-ip"];
  const rawAddress = forwardedValue || (Array.isArray(realIp) ? realIp[0] : realIp) || socket.handshake.address || "unknown";
  const normalized = normalizeAddress(rawAddress);
  return createHmac("sha256", env.jwtSecret).update(`talking-room-ip:${normalized}`).digest("hex");
}
