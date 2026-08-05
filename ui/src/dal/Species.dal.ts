import axios from "axios";

export interface SpeciesInfo {
  title: string;
  extract: string;
  image?: string;
}

interface CacheEntry extends SpeciesInfo {
  fetchedAt: number;
}

const CACHE_KEY = "species_wiki_cache_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Wikipedia summary for a species, cached for 30 days.
 * Returns null when the query is empty or the lookup fails with no
 * cached fallback — callers render a DB-only card, never an error.
 */
export async function getSpeciesInfo(
  query?: string
): Promise<SpeciesInfo | null> {
  const trimmed = query?.trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase();
  const cache = readCache();
  const hit = cache[key];
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit;

  try {
    const resp = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        trimmed
      )}`
    );
    const entry: CacheEntry = {
      title: resp.data.title,
      extract: resp.data.extract,
      image: resp.data.thumbnail?.source ?? resp.data.originalimage?.source,
      fetchedAt: Date.now(),
    };
    cache[key] = entry;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // storage full/unavailable — cache is best-effort
    }
    return entry;
  } catch {
    return hit ?? null; // stale beats nothing; null beats an error card
  }
}
