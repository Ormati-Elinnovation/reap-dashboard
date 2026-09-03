import type { TechMap, Transaction } from "./types";

export type Loaded = { tx: Transaction[]; techMap: TechMap };

let cache: Loaded | null = null;
let inflight: Promise<Loaded> | null = null;
const listeners = new Set<() => void>();

export function cachedData(): Loaded | null {
  return cache;
}

export async function loadData(): Promise<Loaded> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/api/internal/data", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("failed to load data");
        const body = (await r.json()) as Loaded;
        cache = { tx: body.tx, techMap: body.techMap };
        inflight = null;
        return cache;
      })
      .catch((e) => {
        inflight = null;
        throw e;
      });
  }
  return inflight;
}

// Manual refresh: clear cache and notify providers to re-fetch.
export function triggerReload(): void {
  cache = null;
  inflight = null;
  listeners.forEach((fn) => fn());
}

export function onReload(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
