import { createServerFn } from "@tanstack/react-start";
import { IcpProfileService } from "@/server/features/icp/services/IcpProfileService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  archiveIcpProfileSchema,
  createIcpProfileSchema,
  listIcpProfilesSchema,
  updateIcpProfileSchema,
} from "@/types/schemas/icp";

export const listIcpProfiles = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listIcpProfilesSchema)
  .handler(({ data, context }) =>
    IcpProfileService.list(context.projectId, data.includeArchived),
  );

export const createIcpProfile = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(createIcpProfileSchema)
  .handler(({ data, context }) =>
    IcpProfileService.create(context.projectId, data),
  );

export const updateIcpProfile = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(updateIcpProfileSchema)
  .handler(({ data, context }) =>
    IcpProfileService.update(context.projectId, data.profileId, data),
  );

export const archiveIcpProfile = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(archiveIcpProfileSchema)
  .handler(({ data, context }) =>
    IcpProfileService.setArchived(
      context.projectId,
      data.profileId,
      data.isArchived,
    ),
  );
