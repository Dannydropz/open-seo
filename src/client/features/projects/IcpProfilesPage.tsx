import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { archiveIcpProfile, listIcpProfiles } from "@/serverFunctions/icp";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { IcpProfileForm } from "./IcpProfileForm";
import type { IcpProfile } from "./icpProfileTypes";

function queryKey(projectId: string, includeArchived: boolean) {
  return ["icpProfiles", projectId, includeArchived];
}

export function IcpProfilesPage({ projectId }: { projectId: string }) {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<IcpProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const client = useQueryClient();
  const profilesQuery = useQuery({
    queryKey: queryKey(projectId, includeArchived),
    queryFn: () => listIcpProfiles({ data: { projectId, includeArchived } }),
  });
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ["icpProfiles", projectId] });
  const archive = useMutation({
    mutationFn: ({
      profileId,
      isArchived,
    }: {
      profileId: string;
      isArchived: boolean;
    }) => archiveIcpProfile({ data: { projectId, profileId, isArchived } }),
    onSuccess: (_, values) => {
      toast.success(
        values.isArchived ? "ICP profile archived" : "ICP profile restored",
      );
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        getStandardErrorMessage(error, "Couldn't update ICP profile"),
      ),
  });

  if (profilesQuery.isPending) {
    return <span className="loading loading-spinner loading-md" />;
  }
  if (profilesQuery.isError) {
    return (
      <div className="alert alert-error text-sm">
        {getStandardErrorMessage(
          profilesQuery.error,
          "Failed to load ICP profiles",
        )}
      </div>
    );
  }

  return (
    <div key={projectId} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Ideal customer profiles</h2>
          <p className="text-sm text-base-content/60">
            Define the buyers that future opportunity scoring should prioritise.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          <Plus className="size-4" /> Add ICP
        </button>
      </div>

      {creating || editing ? (
        <IcpProfileForm
          key={editing?.id ?? "new"}
          projectId={projectId}
          profile={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void invalidate();
          }}
        />
      ) : null}

      <label className="label w-fit cursor-pointer gap-2 p-0 text-sm text-base-content/60">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />
        Show archived profiles
      </label>

      {profilesQuery.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-base-300 px-4 py-3 text-sm text-base-content/60">
          Add a profile before analysing opportunities. It captures who you sell
          to, what they need, and what signals make a keyword valuable.
        </p>
      ) : (
        <div className="space-y-3">
          {profilesQuery.data.map((profile) => (
            <article
              key={profile.id}
              className="rounded-lg border border-base-300 bg-base-100 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{profile.name}</h3>
                    {profile.isArchived ? (
                      <span className="badge badge-ghost badge-sm">
                        Archived
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-base-content/70">
                    {profile.buyer} · {profile.product}
                    {profile.companyType ? ` · ${profile.companyType}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    aria-label={`Edit ${profile.name}`}
                    onClick={() => {
                      setCreating(false);
                      setEditing(profile);
                    }}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    aria-label={
                      profile.isArchived
                        ? `Restore ${profile.name}`
                        : `Archive ${profile.name}`
                    }
                    disabled={archive.isPending}
                    onClick={() =>
                      archive.mutate({
                        profileId: profile.id,
                        isArchived: !profile.isArchived,
                      })
                    }
                  >
                    {profile.isArchived ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <ProfileStatements profile={profile} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileStatements({ profile }: { profile: IcpProfile }) {
  const groups = [
    ["Jobs", profile.jobs],
    ["Pains", profile.pains],
    ["Buying signals", profile.signals],
    ["Exclusions", profile.exclusions],
  ] as const;
  const populated = groups.filter(([, values]) => values.length > 0);
  if (populated.length === 0) return null;
  return (
    <dl className="mt-4 grid gap-3 border-t border-base-200 pt-3 sm:grid-cols-2">
      {populated.map(([label, values]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-base-content/50">{label}</dt>
          <dd className="mt-1 text-sm text-base-content/70">
            {values.join(" · ")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
