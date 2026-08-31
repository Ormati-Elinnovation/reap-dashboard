// API key generation + hashing. Shared by the admin server actions (creation)
// and the request authenticator (verification).

const PREFIX = "reap_";

export function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return PREFIX + body;
}

export async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Shown in the admin UI so a key can be recognised later without storing it.
export function keyPrefix(key: string): string {
  return key.slice(0, PREFIX.length + 8);
}
