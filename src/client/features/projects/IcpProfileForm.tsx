import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createIcpProfile, updateIcpProfile } from "@/serverFunctions/icp";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { IcpProfile } from "./icpProfileTypes";

type FormValue = {
  name: string;
  product: string;
  buyer: string;
  companyType: string;
  jobs: string;
  pains: string;
  signals: string;
  exclusions: string;
};

const blankForm: FormValue = {
  name: "",
  product: "",
  buyer: "",
  companyType: "",
  jobs: "",
  pains: "",
  signals: "",
  exclusions: "",
};

const listToText = (values: string[]) => values.join("\n");
const textToList = (value: string) => [
  ...new Set(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  ),
];

function formFromProfile(profile: IcpProfile): FormValue {
  return {
    name: profile.name,
    product: profile.product,
    buyer: profile.buyer,
    companyType: profile.companyType ?? "",
    jobs: listToText(profile.jobs),
    pains: listToText(profile.pains),
    signals: listToText(profile.signals),
    exclusions: listToText(profile.exclusions),
  };
}

function requestFromForm(projectId: string, form: FormValue) {
  return {
    projectId,
    name: form.name.trim(),
    product: form.product.trim(),
    buyer: form.buyer.trim(),
    companyType: form.companyType.trim() || undefined,
    jobs: textToList(form.jobs),
    pains: textToList(form.pains),
    signals: textToList(form.signals),
    exclusions: textToList(form.exclusions),
  };
}

export function IcpProfileForm({
  projectId,
  profile,
  onClose,
  onSaved,
}: {
  projectId: string;
  profile: IcpProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormValue>(
    profile ? formFromProfile(profile) : blankForm,
  );
  const save = useMutation({
    mutationFn: () => {
      const request = requestFromForm(projectId, form);
      return profile
        ? updateIcpProfile({ data: { ...request, profileId: profile.id } })
        : createIcpProfile({ data: request });
    },
    onSuccess: () => {
      toast.success(profile ? "ICP profile updated" : "ICP profile created");
      onSaved();
    },
    onError: (error) =>
      toast.error(getStandardErrorMessage(error, "Couldn't save ICP profile")),
  });
  const set = (key: keyof FormValue, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{profile ? "Edit ICP" : "New ICP"}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Profile name"
          value={form.name}
          onChange={(value) => set("name", value)}
          placeholder="e.g. UK independent clinic owner"
          required
        />
        <Field
          label="Buyer"
          value={form.buyer}
          onChange={(value) => set("buyer", value)}
          placeholder="e.g. Owner-operator of a private clinic"
          required
        />
        <Field
          label="Product / category"
          value={form.product}
          onChange={(value) => set("product", value)}
          placeholder="e.g. SEO platform for local clinics"
          required
        />
        <Field
          label="Company type"
          value={form.companyType}
          onChange={(value) => set("companyType", value)}
          placeholder="e.g. Independent dental and aesthetic clinics"
        />
      </div>
      <p className="text-xs text-base-content/50">
        Add one statement per line. These become explicit evidence for the
        relevance score in the next phase.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextList
          label="Jobs to be done"
          value={form.jobs}
          onChange={(value) => set("jobs", value)}
          placeholder="Get more qualified local leads"
        />
        <TextList
          label="Pains"
          value={form.pains}
          onChange={(value) => set("pains", value)}
          placeholder="Agency reporting is unclear"
        />
        <TextList
          label="Buying signals"
          value={form.signals}
          onChange={(value) => set("signals", value)}
          placeholder="Comparing SEO tools"
        />
        <TextList
          label="Exclusions"
          value={form.exclusions}
          onChange={(value) => set("exclusions", value)}
          placeholder="Enterprise in-house SEO teams"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={save.isPending}
        >
          {save.isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          Save ICP
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="form-control">
      <span className="label-text text-sm">{label}</span>
      <input
        className="input input-bordered input-sm w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={500}
      />
    </label>
  );
}

function TextList({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="form-control">
      <span className="label-text text-sm">{label}</span>
      <textarea
        className="textarea textarea-bordered min-h-20 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={4000}
      />
    </label>
  );
}
