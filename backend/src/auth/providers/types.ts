export type OAuthProvider = "google";

export type VerifiedOAuthProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};
