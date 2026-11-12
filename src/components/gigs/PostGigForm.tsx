import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { ImagePlus, X } from "lucide-react";
import { TagListInput } from "../discovery/TagListInput";
import { getGigCategories, getGigOptions, createPostedGig, updatePostedGig } from "../../services/gigs";
import { getUploadPresign, uploadToCloudinary } from "../../services/upload";
import { ApiError } from "../../utils/apiError";
import type { ApiResponse } from "../../types";
import type { GigCapacityType, GigPricingType, GigWorkMode, PostedGig, PostGigPayload } from "../../types/gig";

interface PostGigFormProps {
  mode: "create" | "edit";
  initial?: PostedGig;
}

interface FormState {
  title: string;
  short_description: string;
  category_id: string;
  pricing_type: GigPricingType | "";
  price_amount: string;
  price_max: string;
  work_mode: GigWorkMode | "";
  location: string;
  address: string;
  contact_whatsapp: string;
  contact_email: string;
  description: string;
  requirements: string;
  application_deadline: string;
  expected_start_date: string;
  expected_completion_date: string;
  capacity_type: GigCapacityType;
  applicant_limit: string;
  skills: string[];
  tags: string[];
  cover_source: "none" | "cloudinary" | "external";
  cover_public_id: string | null;
  cover_preview_url: string | null;
  cover_external_url: string;
}

const emptyForm: FormState = {
  title: "",
  short_description: "",
  category_id: "",
  pricing_type: "",
  price_amount: "",
  price_max: "",
  work_mode: "",
  location: "",
  address: "",
  contact_whatsapp: "",
  contact_email: "",
  description: "",
  requirements: "",
  application_deadline: "",
  expected_start_date: "",
  expected_completion_date: "",
  capacity_type: "open",
  applicant_limit: "",
  skills: [],
  tags: [],
  cover_source: "none",
  cover_public_id: null,
  cover_preview_url: null,
  cover_external_url: "",
};

const fromPostedGig = (gig: PostedGig): FormState => ({
  title: gig.title,
  short_description: gig.short_description,
  category_id: String(gig.category.id),
  pricing_type: gig.pricing_type,
  price_amount: gig.price_amount !== null ? String(gig.price_amount) : "",
  price_max: gig.price_max !== null ? String(gig.price_max) : "",
  work_mode: gig.work_mode,
  location: gig.location ?? "",
  address: gig.address ?? "",
  contact_whatsapp: gig.contact.whatsapp ?? "",
  contact_email: gig.contact.email ?? "",
  description: gig.description ?? "",
  requirements: gig.requirements ?? "",
  application_deadline: gig.application_deadline ? gig.application_deadline.slice(0, 10) : "",
  expected_start_date: gig.expected_start_date ?? "",
  expected_completion_date: gig.expected_completion_date ?? "",
  capacity_type: gig.capacity_type,
  applicant_limit: gig.applicant_limit !== null ? String(gig.applicant_limit) : "",
  skills: gig.skills,
  tags: gig.tags,
  cover_source: gig.cover_image?.source ?? "none",
  cover_public_id: gig.cover_image?.source === "cloudinary" ? gig.cover_image.public_id : null,
  cover_preview_url: gig.cover_image?.url ?? null,
  cover_external_url: gig.cover_image?.source === "external" ? gig.cover_image.url : "",
});

const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-aquamarine-300 focus:outline-none focus:ring-2 focus:ring-aquamarine-300/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500";
const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300";

const getFieldErrors = (error: unknown): Record<string, string[]> => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const apiError = ApiError.fromAxiosError(error as AxiosError<ApiResponse>);
    if (apiError.code === "VALIDATION_ERROR" && apiError.details) {
      return apiError.details as Record<string, string[]>;
    }
  }
  return {};
};

const getGeneralError = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "object" && error !== null && "response" in error) {
    const apiError = ApiError.fromAxiosError(error as AxiosError<ApiResponse>);
    if (apiError.code === "VALIDATION_ERROR") return null; // shown field-by-field instead
    return apiError.getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong — please try again.";
};

const FieldError = ({ messages }: { messages?: string[] }) =>
  messages && messages.length > 0 ? (
    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{messages[0]}</p>
  ) : null;

/**
 * Create (/feed/gigs/new) and edit (/feed/gigs/posted/:id/edit, draft/rejected
 * only) share this form. Sections match the design guide's §10 table exactly.
 */
export const PostGigForm = ({ mode, initial }: PostGigFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initial ? fromPostedGig(initial) : emptyForm);
  const [dirty, setDirty] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["gig-categories"],
    queryFn: getGigCategories,
    staleTime: 60 * 60 * 1000,
  });
  const { data: options } = useQuery({
    queryKey: ["gig-options"],
    queryFn: getGigOptions,
    staleTime: 60 * 60 * 1000,
  });

  // Warn before a reload/close with unsaved changes. In-app nav-link clicks
  // aren't intercepted — this app uses a plain BrowserRouter, and RRv6/v7's
  // useBlocker needs a data router (see docs/DECISIONS.md).
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: ({ payload }: { payload: PostGigPayload }) =>
      mode === "edit" && initial
        ? updatePostedGig(initial.id, payload)
        : createPostedGig(payload),
    onSuccess: (gig) => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["posted-gigs"] });
      navigate(`/feed/gigs/posted/${gig.id}`, { replace: true });
    },
  });

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const presign = await getUploadPresign({
        purpose: "thumbnail",
        file_type: file.type,
        file_size: file.size,
      });
      const uploaded = await uploadToCloudinary(file, presign);
      setDirty(true);
      setForm((prev) => ({
        ...prev,
        cover_source: "cloudinary",
        cover_public_id: uploaded.public_id,
        cover_preview_url: uploaded.secure_url,
      }));
    } catch {
      setUploadError("Couldn't upload that image — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeCover = () => {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      cover_source: "none",
      cover_public_id: null,
      cover_preview_url: null,
      cover_external_url: "",
    }));
  };

  const buildPayload = (submit: boolean): PostGigPayload => {
    const coverImage: PostGigPayload["cover_image"] =
      form.cover_source === "cloudinary" && form.cover_public_id
        ? { source: "cloudinary", public_id: form.cover_public_id }
        : form.cover_source === "external" && form.cover_external_url
          ? { source: "external", url: form.cover_external_url }
          : null;

    return {
      title: form.title.trim(),
      short_description: form.short_description.trim(),
      category_id: Number(form.category_id),
      pricing_type: form.pricing_type as GigPricingType,
      price_amount: form.price_amount ? Number(form.price_amount) : undefined,
      price_max:
        form.pricing_type === "negotiable" && form.price_max ? Number(form.price_max) : undefined,
      work_mode: form.work_mode as GigWorkMode,
      location: form.work_mode === "remote" ? undefined : form.location.trim() || undefined,
      address: form.work_mode === "remote" ? undefined : form.address.trim() || undefined,
      contact_whatsapp: form.contact_whatsapp.trim() || undefined,
      contact_email: form.contact_email.trim() || undefined,
      description: form.description.trim() || undefined,
      requirements: form.requirements.trim() || undefined,
      application_deadline: form.application_deadline || null,
      expected_start_date: form.expected_start_date || null,
      expected_completion_date: form.expected_completion_date || null,
      capacity_type: form.capacity_type,
      applicant_limit:
        form.capacity_type === "limited" && form.applicant_limit
          ? Number(form.applicant_limit)
          : null,
      skills: form.skills,
      tags: form.tags,
      cover_image: coverImage,
      submit,
    };
  };

  const fieldErrors = getFieldErrors(saveMutation.error);
  const generalError = getGeneralError(saveMutation.error);
  const isRemote = form.work_mode === "remote";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.mutate({ payload: buildPayload(true) });
      }}
      className="space-y-8"
    >
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gig basics</h2>
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value.slice(0, 200))}
            maxLength={200}
            className={fieldClass}
          />
          <FieldError messages={fieldErrors.title} />
        </div>
        <div>
          <label className={labelClass}>Short description</label>
          <textarea
            value={form.short_description}
            onChange={(e) => update("short_description", e.target.value.slice(0, 500))}
            maxLength={500}
            rows={2}
            className={fieldClass}
          />
          <FieldError messages={fieldErrors.short_description} />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={form.category_id}
            onChange={(e) => update("category_id", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldError messages={fieldErrors.category_id} />
        </div>
        <div>
          <label className={labelClass}>Full description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value.slice(0, 10000))}
            maxLength={10000}
            rows={5}
            className={fieldClass}
          />
          <FieldError messages={fieldErrors.description} />
        </div>
        <div>
          <label className={labelClass}>Requirements (optional)</label>
          <textarea
            value={form.requirements}
            onChange={(e) => update("requirements", e.target.value.slice(0, 5000))}
            maxLength={5000}
            rows={3}
            className={fieldClass}
          />
          <FieldError messages={fieldErrors.requirements} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Work and price</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Work mode</label>
            <select
              value={form.work_mode}
              onChange={(e) => update("work_mode", e.target.value as GigWorkMode)}
              className={fieldClass}
            >
              <option value="">Select work mode</option>
              {options?.work_modes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <FieldError messages={fieldErrors.work_mode} />
          </div>
          <div>
            <label className={labelClass}>Pricing</label>
            <select
              value={form.pricing_type}
              onChange={(e) => update("pricing_type", e.target.value as GigPricingType)}
              className={fieldClass}
            >
              <option value="">Select pricing</option>
              {options?.pricing_types.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <FieldError messages={fieldErrors.pricing_type} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              {form.pricing_type === "negotiable" ? "Indicative amount (optional)" : "Price (Le)"}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price_amount}
              onChange={(e) => update("price_amount", e.target.value)}
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.price_amount} />
          </div>
          {form.pricing_type === "negotiable" && (
            <div>
              <label className={labelClass}>Up to (optional)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price_max}
                onChange={(e) => update("price_max", e.target.value)}
                className={fieldClass}
              />
              <FieldError messages={fieldErrors.price_max} />
            </div>
          )}
        </div>
      </section>

      {!isRemote && (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Location</h2>
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Freetown"
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.location} />
          </div>
          <div>
            <label className={labelClass}>Address (optional)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.address} />
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contact</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter the contact details you want interested students to use for this gig.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>WhatsApp number</label>
            <input
              type="text"
              value={form.contact_whatsapp}
              onChange={(e) => update("contact_whatsapp", e.target.value)}
              placeholder="076 123456"
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.contact_whatsapp} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => update("contact_email", e.target.value)}
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.contact_email} />
          </div>
        </div>
        <FieldError messages={fieldErrors.contact} />
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Timing and capacity</h2>
        <div>
          <label className={labelClass}>Application deadline (optional)</label>
          <input
            type="date"
            value={form.application_deadline}
            onChange={(e) => update("application_deadline", e.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            End of this day, Sierra Leone time.
          </p>
          <FieldError messages={fieldErrors.application_deadline} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Expected start date (optional)</label>
            <input
              type="date"
              value={form.expected_start_date}
              onChange={(e) => update("expected_start_date", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Expected completion date (optional)</label>
            <input
              type="date"
              value={form.expected_completion_date}
              onChange={(e) => update("expected_completion_date", e.target.value)}
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.expected_completion_date} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Capacity</label>
          <select
            value={form.capacity_type}
            onChange={(e) => update("capacity_type", e.target.value as GigCapacityType)}
            className={fieldClass}
          >
            {options?.capacity_types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        {form.capacity_type === "limited" && (
          <div>
            <label className={labelClass}>Applicant limit</label>
            <input
              type="number"
              min={1}
              max={options?.limits.max_applicant_limit}
              value={form.applicant_limit}
              onChange={(e) => update("applicant_limit", e.target.value)}
              className={fieldClass}
            />
            <FieldError messages={fieldErrors.applicant_limit} />
          </div>
        )}
      </section>

      <details className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <summary className="cursor-pointer text-lg font-bold text-gray-900 dark:text-white">
          Optional extras
        </summary>
        <div className="mt-4 space-y-4">
          <TagListInput
            label="Skills"
            values={form.skills}
            onChange={(value) => update("skills", value)}
            placeholder="e.g. figma, branding"
            max={options?.limits.max_skills}
          />
          <TagListInput
            label="Tags"
            values={form.tags}
            onChange={(value) => update("tags", value)}
            placeholder="e.g. logo, bakery"
            max={options?.limits.max_tags}
          />
          <div>
            <label className={labelClass}>Cover image (optional)</label>
            {form.cover_preview_url ? (
              <div className="relative inline-block">
                <img
                  src={form.cover_preview_url}
                  alt=""
                  className="h-28 w-44 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={removeCover}
                  aria-label="Remove cover image"
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 hover:border-aquamarine-300 dark:border-gray-600 dark:text-gray-400">
                <ImagePlus className="h-6 w-6" aria-hidden />
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileSelect(file);
                  }}
                />
              </label>
            )}
            {uploadError && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{uploadError}</p>}
          </div>
        </div>
      </details>

      {generalError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {generalError}
        </p>
      )}

      {/* `bottom-16` clears the fixed mobile BottomNav (hidden from `md` up, where `bottom-0` applies instead). */}
      <div className="sticky bottom-16 md:bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95">
        <p className="mr-auto text-sm text-gray-500 dark:text-gray-400">
          Every gig requires admin approval before appearing publicly.
        </p>
        <button
          type="button"
          onClick={() => {
            if (dirty && !window.confirm("Discard your changes?")) return;
            navigate(-1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate({ payload: buildPayload(false) })}
          disabled={saveMutation.isPending}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Save draft
        </button>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded-xl bg-aquamarine-500 px-6 py-2.5 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveMutation.isPending ? "Submitting…" : "Submit for approval"}
        </button>
      </div>
    </form>
  );
};
