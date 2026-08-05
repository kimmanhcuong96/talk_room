import type { UserRole } from "./auth";

export type UserPermission = "create_room" | "use_camera";

const rolePermissions: Record<UserRole, ReadonlySet<UserPermission>> = {
  unverified: new Set(),
  verified: new Set(["create_room"]),
  supporter: new Set(["create_room", "use_camera"])
};

export function hasPermission(role: UserRole, permission: UserPermission) {
  return rolePermissions[role].has(permission);
}
