import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import { icpProfileStatements, icpProfiles } from "@/db/schema";
import type { IcpProfileInput, IcpStatementKind } from "@/types/schemas/icp";
import { chunkIcpStatements } from "./icpStatementBatches";

export type IcpProfile = {
  id: string;
  projectId: string;
  name: string;
  product: string;
  buyer: string;
  companyType: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  jobs: string[];
  pains: string[];
  signals: string[];
  exclusions: string[];
};

const statementFields: Record<
  IcpStatementKind,
  keyof Pick<IcpProfile, "jobs" | "pains" | "signals" | "exclusions">
> = {
  job: "jobs",
  pain: "pains",
  signal: "signals",
  exclusion: "exclusions",
};

function statementRows(profileId: string, input: IcpProfileInput) {
  const entries: { kind: IcpStatementKind; values: string[] }[] = [
    { kind: "job", values: input.jobs },
    { kind: "pain", values: input.pains },
    { kind: "signal", values: input.signals },
    { kind: "exclusion", values: input.exclusions },
  ];
  return entries.flatMap(({ kind, values }) =>
    [...new Set(values)].map((content, position) => ({
      id: crypto.randomUUID(),
      profileId,
      kind,
      content,
      position,
    })),
  );
}

function hydrateProfiles(
  profiles: (typeof icpProfiles.$inferSelect)[],
  statements: (typeof icpProfileStatements.$inferSelect)[],
): IcpProfile[] {
  const grouped = new Map<
    string,
    (typeof icpProfileStatements.$inferSelect)[]
  >();
  for (const row of statements) {
    const rows = grouped.get(row.profileId) ?? [];
    rows.push(row);
    grouped.set(row.profileId, rows);
  }
  return profiles.map((profile) => {
    const hydrated: IcpProfile = {
      ...profile,
      jobs: [],
      pains: [],
      signals: [],
      exclusions: [],
    };
    for (const row of grouped.get(profile.id) ?? []) {
      hydrated[statementFields[row.kind]].push(row.content);
    }
    return hydrated;
  });
}

async function getProfileRow(projectId: string, profileId: string) {
  const [profile] = await db
    .select()
    .from(icpProfiles)
    .where(
      and(eq(icpProfiles.projectId, projectId), eq(icpProfiles.id, profileId)),
    )
    .limit(1);
  return profile ?? null;
}

export const IcpProfileRepository = {
  async list(projectId: string, includeArchived: boolean) {
    const profiles = await db
      .select()
      .from(icpProfiles)
      .where(
        includeArchived
          ? eq(icpProfiles.projectId, projectId)
          : and(
              eq(icpProfiles.projectId, projectId),
              eq(icpProfiles.isArchived, false),
            ),
      )
      .orderBy(desc(icpProfiles.updatedAt), asc(icpProfiles.name));
    if (profiles.length === 0) return [];
    const statements = await db
      .select()
      .from(icpProfileStatements)
      .where(
        inArray(
          icpProfileStatements.profileId,
          profiles.map((profile) => profile.id),
        ),
      )
      .orderBy(
        asc(icpProfileStatements.kind),
        asc(icpProfileStatements.position),
      );
    return hydrateProfiles(profiles, statements);
  },

  async create(projectId: string, input: IcpProfileInput) {
    const id = crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const statements = statementRows(id, input);
    await runBatch((tx) => [
      tx.insert(icpProfiles).values({
        id,
        projectId,
        name: input.name,
        product: input.product,
        buyer: input.buyer,
        companyType: input.companyType || null,
        updatedAt,
      }),
      ...chunkIcpStatements(statements).map((batch) =>
        tx.insert(icpProfileStatements).values(batch),
      ),
    ]);
    return this.require(projectId, id);
  },

  async update(projectId: string, profileId: string, input: IcpProfileInput) {
    const current = await getProfileRow(projectId, profileId);
    if (!current) return null;
    const updatedAt = new Date().toISOString();
    const statements = statementRows(profileId, input);
    await runBatch((tx) => [
      tx
        .update(icpProfiles)
        .set({
          name: input.name,
          product: input.product,
          buyer: input.buyer,
          companyType: input.companyType || null,
          updatedAt,
        })
        .where(eq(icpProfiles.id, profileId)),
      tx
        .delete(icpProfileStatements)
        .where(eq(icpProfileStatements.profileId, profileId)),
      ...chunkIcpStatements(statements).map((batch) =>
        tx.insert(icpProfileStatements).values(batch),
      ),
    ]);
    return this.require(projectId, profileId);
  },

  async setArchived(projectId: string, profileId: string, isArchived: boolean) {
    const current = await getProfileRow(projectId, profileId);
    if (!current) return null;
    await runBatch((tx) => [
      tx
        .update(icpProfiles)
        .set({ isArchived, updatedAt: new Date().toISOString() })
        .where(eq(icpProfiles.id, profileId)),
    ]);
    return this.require(projectId, profileId);
  },

  async require(projectId: string, profileId: string) {
    const profile = await getProfileRow(projectId, profileId);
    if (!profile) return null;
    const statements = await db
      .select()
      .from(icpProfileStatements)
      .where(eq(icpProfileStatements.profileId, profileId))
      .orderBy(
        asc(icpProfileStatements.kind),
        asc(icpProfileStatements.position),
      );
    return hydrateProfiles([profile], statements)[0] ?? null;
  },
};
