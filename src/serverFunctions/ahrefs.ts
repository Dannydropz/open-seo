import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAhrefsDomainRatingsForDomains } from "@/server/lib/ahrefs-domain-rating";
import { requireProjectContext } from "@/serverFunctions/middleware";

/**
 * Ahrefs publishes a free, keyless Domain Rating lookup. We use it to enrich the
 * Backlinks table on demand — no billing, no stored data. Every result (a DR, or
 * `null` when Ahrefs has no rating) is cached in KV for a day so re-opening the
 * table is free.
 */
const MAX_DOMAINS_PER_CALL = 100;

const domainRatingsInputSchema = z.object({
  projectId: z.string().min(1),
  domains: z.array(z.string().trim().min(1).max(253)).max(MAX_DOMAINS_PER_CALL),
});

export const getAhrefsDomainRatings = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainRatingsInputSchema)
  .handler(({ data }) => getAhrefsDomainRatingsForDomains(data.domains));
