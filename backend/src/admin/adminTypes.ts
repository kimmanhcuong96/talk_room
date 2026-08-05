export type AdminRole = "owner" | "admin";
export type AdminStatus = "invited" | "active" | "suspended";

export type AdminProfile = {
  id: string;
  googleId: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  status: AdminStatus;
  invitedBy: string | null;
  createdAt: string;
  activatedAt: string | null;
  lastLogin: string | null;
};
