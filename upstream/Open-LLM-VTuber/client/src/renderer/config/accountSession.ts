const accountSessionKey = "arknights-vtuber-pet.account-session.v1";

export function loadAccountToken(): string {
  return sessionStorage.getItem(accountSessionKey) ?? "";
}

export function saveAccountToken(token: string): void {
  sessionStorage.setItem(accountSessionKey, token);
}

export function clearAccountToken(): void {
  sessionStorage.removeItem(accountSessionKey);
}
