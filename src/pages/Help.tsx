import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AlertCircle, MessageCircle, RefreshCcw } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { getGuidanceOptions, submitGuidanceInquiry } from "../services/guidance";
import {
  getDepartments,
  getFaculties,
  getUniversities,
} from "../services/onboarding";
import { ApiError } from "../utils/apiError";
import type { ApiResponse } from "../types";
import type { GuidanceInquiryPayload, GuidanceRequiredContext } from "../types/guidance";

const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500";
const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300";

const FieldError = ({ messages }: { messages?: string[] }) =>
  messages && messages.length > 0 ? (
    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{messages[0]}</p>
  ) : null;

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
  return "Something went wrong — please try again.";
};

const contextLabel: Record<GuidanceRequiredContext, string> = {
  none: "nothing extra",
  university: "your university",
  faculty: "your university and faculty",
  department: "your university, faculty and department",
};

/**
 * Get Help: a category + (profile or chosen) academic context + an optional
 * question gets the student a WhatsApp contact — an approved guide, or
 * UniVybe's central number. UniVybe only ever provides the contact: nothing
 * is sent, and there is no chat, ticket or delivery tracking.
 */
export const Help = () => {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [overrideUniversityId, setOverrideUniversityId] = useState<number | null>(null);
  const [overrideFacultyId, setOverrideFacultyId] = useState<number | null>(null);
  const [overrideDepartmentId, setOverrideDepartmentId] = useState<number | null>(null);

  const optionsQuery = useQuery({
    queryKey: ["guidance-options"],
    queryFn: getGuidanceOptions,
  });
  const options = optionsQuery.data;
  const hasProfileContext = !!options?.profile_context.university;
  // Nothing to summarise from a profile that isn't set up yet — go straight
  // to the picker instead of offering a "use my profile" row with nothing in it.
  const overriding = useOverride || (!!options && !hasProfileContext);

  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
    enabled: overriding,
  });
  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties", overrideUniversityId],
    queryFn: () => getFaculties(overrideUniversityId as number),
    enabled: overriding && !!overrideUniversityId,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", overrideUniversityId, overrideFacultyId],
    queryFn: () =>
      getDepartments(overrideUniversityId as number, overrideFacultyId as number),
    enabled: overriding && !!overrideUniversityId && !!overrideFacultyId,
  });

  const category = useMemo(
    () => options?.categories.find((c) => c.id === categoryId) ?? null,
    [options, categoryId]
  );

  // What would actually be sent: the profile's ids, unless overriding.
  const effectiveContext = overriding
    ? {
        university_id: overrideUniversityId ?? undefined,
        faculty_id: overrideFacultyId ?? undefined,
        department_id: overrideDepartmentId ?? undefined,
      }
    : {
        university_id: options?.profile_context.university?.id,
        faculty_id: options?.profile_context.faculty?.id,
        department_id: options?.profile_context.department?.id,
      };

  const requiredContextSatisfied = (() => {
    if (!category) return true;
    if (category.required_context === "university")
      return !!effectiveContext.university_id;
    if (category.required_context === "faculty")
      return !!effectiveContext.faculty_id;
    if (category.required_context === "department")
      return !!effectiveContext.department_id;
    return true;
  })();

  const inquiryMutation = useMutation({
    mutationFn: (payload: GuidanceInquiryPayload) => submitGuidanceInquiry(payload),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryId || !requiredContextSatisfied || inquiryMutation.isPending) return;

    const trimmedQuestion = question.trim();
    inquiryMutation.mutate({
      category_id: categoryId,
      ...effectiveContext,
      question: trimmedQuestion ? trimmedQuestion : undefined,
    });
  };

  const askAgain = () => inquiryMutation.reset();

  const fieldErrors = getFieldErrors(inquiryMutation.error);
  const generalError = getGeneralError(inquiryMutation.error);
  const questionMax = options?.question_max_length ?? 500;

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Get Help
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tell us what you need, and we'll connect you to someone who can
            help on WhatsApp — a UniVybe guide, or our central support
            contact. UniVybe only provides the contact: nothing is sent for
            you, and there's no chat or ticket here.
          </p>
        </header>

        {optionsQuery.isLoading ? (
          <div className="animate-pulse space-y-4" aria-hidden>
            <div className="h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        ) : optionsQuery.isError || !options ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold">We couldn't load the Get Help form.</p>
              <p className="mt-0.5">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => optionsQuery.refetch()}
                className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          </div>
        ) : inquiryMutation.isSuccess && inquiryMutation.data ? (
          <div className="own-links space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-azure-500/10 text-azure-500">
                <MessageCircle className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white">
                  {inquiryMutation.data.contact.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {inquiryMutation.data.routing.is_repeat
                    ? "Same contact as your last request in the past few minutes."
                    : inquiryMutation.data.contact.type === "central"
                      ? "UniVybe's central support contact."
                      : "A UniVybe guide for your question."}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {inquiryMutation.data.notice}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={inquiryMutation.data.contact.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-azure-500 px-5 py-2 font-semibold text-white shadow-md transition-colors hover:bg-azure-600 sm:flex-none"
              >
                Continue to WhatsApp
              </a>
              <button
                type="button"
                onClick={askAgain}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-transparent px-5 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden />
                Ask something else
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="guidance-category" className={labelClass}>
                What do you need help with? *
              </label>
              <select
                id="guidance-category"
                value={categoryId ?? ""}
                onChange={(e) =>
                  setCategoryId(e.target.value ? Number(e.target.value) : null)
                }
                className={fieldClass}
                required
              >
                <option value="">Choose a category</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError messages={fieldErrors.category_id} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              {!overriding ? (
                <>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    We'll use your profile:{" "}
                    <span className="font-semibold">
                      {[
                        options.profile_context.university?.name,
                        options.profile_context.faculty?.name,
                        options.profile_context.department?.name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseOverride(true)}
                    className="mt-2 bg-transparent p-0 text-sm font-semibold text-azure-500 hover:text-azure-600 dark:text-azure-700 dark:hover:text-azure-800"
                  >
                    This is about somewhere else
                  </button>
                  {/* No picker is shown in this mode — surface a server-side
                      context error here instead of leaving it invisible. */}
                  <FieldError messages={fieldErrors.university_id} />
                  <FieldError messages={fieldErrors.faculty_id} />
                  <FieldError messages={fieldErrors.department_id} />
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Which place is this about?
                    </p>
                    {hasProfileContext && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseOverride(false);
                          setOverrideUniversityId(null);
                          setOverrideFacultyId(null);
                          setOverrideDepartmentId(null);
                        }}
                        className="bg-transparent p-0 text-sm font-semibold text-azure-500 hover:text-azure-600 dark:text-azure-700 dark:hover:text-azure-800"
                      >
                        Use my profile instead
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="guidance-university" className={labelClass}>
                        University
                      </label>
                      <select
                        id="guidance-university"
                        value={overrideUniversityId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setOverrideUniversityId(id);
                          setOverrideFacultyId(null);
                          setOverrideDepartmentId(null);
                        }}
                        className={fieldClass}
                      >
                        <option value="">Select a university</option>
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <FieldError messages={fieldErrors.university_id} />
                    </div>
                    <div>
                      <label htmlFor="guidance-faculty" className={labelClass}>
                        Faculty
                      </label>
                      <select
                        id="guidance-faculty"
                        value={overrideFacultyId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setOverrideFacultyId(id);
                          setOverrideDepartmentId(null);
                        }}
                        disabled={!overrideUniversityId}
                        className={fieldClass}
                      >
                        <option value="">Select a faculty</option>
                        {faculties.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <FieldError messages={fieldErrors.faculty_id} />
                    </div>
                    <div>
                      <label htmlFor="guidance-department" className={labelClass}>
                        Department
                      </label>
                      <select
                        id="guidance-department"
                        value={overrideDepartmentId ?? ""}
                        onChange={(e) =>
                          setOverrideDepartmentId(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        disabled={!overrideFacultyId}
                        className={fieldClass}
                      >
                        <option value="">Select a department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <FieldError messages={fieldErrors.department_id} />
                    </div>
                  </div>
                </>
              )}
              {category && !requiredContextSatisfied && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  “{category.name}” needs {contextLabel[category.required_context]}{" "}
                  to find the right contact.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="guidance-question" className={labelClass}>
                Your question (optional)
              </label>
              <textarea
                id="guidance-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, questionMax))}
                maxLength={questionMax}
                rows={4}
                placeholder="Add any detail that will help — this goes straight into the WhatsApp message, nowhere else."
                className={fieldClass}
              />
              <div className="mt-1 flex items-center justify-between">
                <FieldError messages={fieldErrors.question} />
                <span className="text-xs text-gray-400">
                  {question.length}/{questionMax}
                </span>
              </div>
            </div>

            {generalError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                {generalError}
              </p>
            )}

            <button
              type="submit"
              disabled={!categoryId || !requiredContextSatisfied || inquiryMutation.isPending}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-azure-500 px-5 py-2.5 font-semibold text-white shadow-md transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {inquiryMutation.isPending ? "Finding a contact…" : "Get help"}
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
};
