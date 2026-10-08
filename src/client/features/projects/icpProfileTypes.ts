import type { listIcpProfiles } from "@/serverFunctions/icp";

export type IcpProfile = Awaited<ReturnType<typeof listIcpProfiles>>[number];
