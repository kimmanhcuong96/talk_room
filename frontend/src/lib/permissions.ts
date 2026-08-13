import type { UserRole } from "./auth";

export type UserPermission = "create_room" | "use_camera" | "favorite_user";

const rolePermissions: Record<UserRole, ReadonlySet<UserPermission>> = {
  unverified: new Set(),
  verified: new Set(["create_room", "favorite_user"]),
  supporter: new Set(["create_room", "use_camera", "favorite_user"])
};

export function hasPermission(role: UserRole, permission: UserPermission) {
  return rolePermissions[role].has(permission);
}
