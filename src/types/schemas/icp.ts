import { z } from "zod";

export const ICP_STATEMENT_KINDS = [
  "job",
  "pain",
  "signal",
  "exclusion",
] as const;

export type IcpStatementKind = (typeof ICP_STATEMENT_KINDS)[number];

const profileText = z.string().trim().min(1).max(500);
const optionalProfileText = z.string().trim().max(500);
const statement = z.string().trim().min(1).max(500);

const profileFields = z.object({
  name: profileText.max(120),
  product: profileText,
  buyer: profileText,
  companyType: optionalProfileText.optional(),
  jobs: z.array(statement).max(20).default([]),
  pains: z.array(statement).max(20).default([]),
  signals: z.array(statement).max(20).default([]),
  exclusions: z.array(statement).max(20).default([]),
});

export const listIcpProfilesSchema = z.object({
  projectId: z.string().min(1),
  includeArchived: z.boolean().optional().default(false),
});

export const createIcpProfileSchema = profileFields.extend({
  projectId: z.string().min(1),
});

export const updateIcpProfileSchema = profileFields.extend({
  projectId: z.string().min(1),
  profileId: z.string().min(1),
});

export const archiveIcpProfileSchema = z.object({
  projectId: z.string().min(1),
  profileId: z.string().min(1),
  isArchived: z.boolean(),
});

export type IcpProfileInput = z.infer<typeof profileFields>;
