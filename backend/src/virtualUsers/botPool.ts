import type { VirtualUserProfile, VirtualUserRuntime } from "./virtualUserTypes.js";

export class BotPool {
  private readonly profiles = new Map<string, VirtualUserProfile>();
  private readonly runtimes = new Map<string, VirtualUserRuntime>();

  replaceProfiles(profiles: VirtualUserProfile[]) {
    this.profiles.clear();
    for (const profile of profiles) {
      this.profiles.set(profile.id, profile);
      const current = this.runtimes.get(profile.id);
      this.runtimes.set(profile.id, current ?? { botId: profile.id, status: "AVAILABLE" });
    }
    for (const botId of this.runtimes.keys()) {
      if (!this.profiles.has(botId)) this.runtimes.delete(botId);
    }
  }

  updateProfile(profile: VirtualUserProfile) {
    this.profiles.set(profile.id, profile);
    if (!this.runtimes.has(profile.id)) this.runtimes.set(profile.id, { botId: profile.id, status: "AVAILABLE" });
  }

  assign(roomId: string) {
    const alreadyAssigned = [...this.runtimes.values()].find((runtime) => runtime.roomId === roomId);
    if (alreadyAssigned) return this.profiles.get(alreadyAssigned.botId) ?? null;
    const runtime = [...this.runtimes.values()].find((candidate) =>
      candidate.status === "AVAILABLE" && this.profiles.get(candidate.botId)?.enabled
    );
    if (!runtime) return null;
    runtime.status = "ACTIVE";
    runtime.roomId = roomId;
    return this.profiles.get(runtime.botId) ?? null;
  }

  releaseRoom(roomId: string) {
    const runtime = [...this.runtimes.values()].find((candidate) => candidate.roomId === roomId);
    if (!runtime) return null;
    const profile = this.profiles.get(runtime.botId) ?? null;
    runtime.status = "AVAILABLE";
    delete runtime.roomId;
    return profile;
  }

  getProfile(botId: string) {
    return this.profiles.get(botId);
  }

  getRuntime(botId: string) {
    return this.runtimes.get(botId);
  }

  list() {
    return [...this.profiles.values()].map((profile) => ({
      profile,
      runtime: { ...this.runtimes.get(profile.id)! }
    }));
  }
}
