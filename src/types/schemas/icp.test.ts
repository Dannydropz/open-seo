import { describe, expect, it } from "vitest";
import {
  createIcpProfileSchema,
  updateIcpProfileSchema,
} from "./icp";

const baseProfile = {
  projectId: "project_1",
  name: "Clinic owner",
  product: "SEO platform",
  buyer: "Independent clinic owner",
};

describe("ICP profile schemas", () => {
  it("defaults optional statement lists to empty arrays", () => {
    expect(createIcpProfileSchema.parse(baseProfile)).toMatchObject({
      ...baseProfile,
      jobs: [],
      pains: [],
      signals: [],
      exclusions: [],
    });
  });

  it("keeps an update scoped to one project and profile", () => {
    expect(
      updateIcpProfileSchema.parse({
        ...baseProfile,
        profileId: "profile_1",
        pains: ["Unclear agency reporting"],
      }),
    ).toMatchObject({
      projectId: "project_1",
      profileId: "profile_1",
      pains: ["Unclear agency reporting"],
    });
  });

  it("rejects a profile with too many pain statements", () => {
    expect(() =>
      createIcpProfileSchema.parse({
        ...baseProfile,
        pains: Array.from({ length: 21 }, (_, index) => `Pain ${index}`),
      }),
    ).toThrow();
  });
});
