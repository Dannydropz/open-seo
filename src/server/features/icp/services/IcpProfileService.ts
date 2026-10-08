import { AppError } from "@/server/lib/errors";
import { IcpProfileRepository } from "../repositories/IcpProfileRepository";
import type { IcpProfileInput } from "@/types/schemas/icp";

export const IcpProfileService = {
  list(projectId: string, includeArchived: boolean) {
    return IcpProfileRepository.list(projectId, includeArchived);
  },

  create(projectId: string, input: IcpProfileInput) {
    return IcpProfileRepository.create(projectId, input);
  },

  async update(projectId: string, profileId: string, input: IcpProfileInput) {
    const profile = await IcpProfileRepository.update(
      projectId,
      profileId,
      input,
    );
    if (!profile) throw new AppError("NOT_FOUND", "ICP profile not found");
    return profile;
  },

  async setArchived(projectId: string, profileId: string, isArchived: boolean) {
    const profile = await IcpProfileRepository.setArchived(
      projectId,
      profileId,
      isArchived,
    );
    if (!profile) throw new AppError("NOT_FOUND", "ICP profile not found");
    return profile;
  },
};
