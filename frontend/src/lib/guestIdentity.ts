const GUEST_ID_STORAGE_KEY = "me2talk:guest-id";
const LEGACY_GUEST_ID_STORAGE_KEY = "talking-room:guest-id";
let inMemoryGuestId: string | null = null;

function createGuestId() {
  if (typeof crypto.randomUUID === "function") {
    return `guest-${crypto.randomUUID()}`;
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  return `guest-${Array.from(randomBytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function getOrCreateGuestId() {
  if (inMemoryGuestId) return inMemoryGuestId;

  try {
    const storedGuestId = localStorage.getItem(GUEST_ID_STORAGE_KEY) ?? localStorage.getItem(LEGACY_GUEST_ID_STORAGE_KEY);
    if (storedGuestId) {
      localStorage.setItem(GUEST_ID_STORAGE_KEY, storedGuestId);
      inMemoryGuestId = storedGuestId;
      return storedGuestId;
    }

    const guestId = createGuestId();
    localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
    inMemoryGuestId = guestId;
    return guestId;
  } catch {
    inMemoryGuestId = createGuestId();
    return inMemoryGuestId;
  }
}
