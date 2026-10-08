import { env } from "cloudflare:workers";
import { chunk } from "remeda";
import { z } from "zod";
import { normalizeDomainInput } from "@/server/lib/domainUtils";

const AHREFS_DR_ENDPOINT =
  "https://api.ahrefs.com/v3/public/domain-rating-free";
const CACHE_PREFIX = "ahrefs-dr:";
const CACHE_TTL_SECONDS = 86_400;
const FETCH_TIMEOUT_MS = 5_000;
const FETCH_BATCH_SIZE = 20;

const ahrefsResponseSchema = z.object({
  domain_rating: z.object({
    domain_rating: z.number().min(0).max(100),
  }),
});

/**
 * Returns Ahrefs DR keyed by the caller's original domains. A result of null
 * means Ahrefs has no rating or the individual lookup failed. Cache misses are
 * resolved in small batches so SERP enrichment does not fan out unboundedly.
 */
export async function getAhrefsDomainRatingsForDomains(
  inputDomains: string[],
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  const originalsByDomain = new Map<string, string[]>();
  for (const original of inputDomains) {
    const domain = normalizeDomainInput(original, true);
    const existing = originalsByDomain.get(domain);
    if (existing) existing.push(original);
    else originalsByDomain.set(domain, [original]);
  }

  const ratings = new Map<string, number | null>();
  for (const batch of chunk([...originalsByDomain.keys()], FETCH_BATCH_SIZE)) {
    const resolved = await Promise.all(
      batch.map(async (domain) => {
        try {
          return [domain, await resolveDomainRating(domain)] as const;
        } catch {
          return [domain, null] as const;
        }
      }),
    );
    for (const [domain, dr] of resolved) ratings.set(domain, dr);
  }

  for (const [domain, originals] of originalsByDomain) {
    const dr = ratings.get(domain) ?? null;
    for (const original of originals) result[original] = dr;
  }
  return result;
}

async function resolveDomainRating(domain: string): Promise<number | null> {
  const cacheKey = `${CACHE_PREFIX}${domain}`;
  const cached = await env.KV.get(cacheKey);
  if (cached !== null) return parseCachedRating(cached);

  const dr = await fetchDomainRating(domain);
  await env.KV.put(cacheKey, JSON.stringify(dr), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
  return dr;
}

async function fetchDomainRating(domain: string): Promise<number | null> {
  const response = await fetch(
    `${AHREFS_DR_ENDPOINT}?target=${encodeURIComponent(domain)}`,
    { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );
  if (!response.ok) {
    throw new Error(`Ahrefs DR lookup failed with status ${response.status}`);
  }
  const parsed = ahrefsResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Ahrefs DR lookup returned an unexpected response");
  }
  const dr = parsed.data.domain_rating.domain_rating;
  return dr > 0 ? dr : null;
}

function parseCachedRating(raw: string): number | null {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "number" && value > 0 ? value : null;
  } catch {
    return null;
  }
}
