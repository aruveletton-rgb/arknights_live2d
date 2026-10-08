const sessionKey = "arknights-vtuber-pet.session.v1";

export function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(sessionKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(sessionKey, created);
  return created;
}

export function clearSessionId(): void {
  sessionStorage.removeItem(sessionKey);
}
