import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { AxiosError } from "axios";
import { Users } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { BottomSheet } from "../components/common/BottomSheet";
import {
  closePostedGig,
  deletePostedGig,
  getPostedGig,
  reopenPostedGig,
  submitPostedGig,
  updatePostedGigSettings,
} from "../services/gigs";
import { ApiError } from "../utils/apiError";
import type { ApiResponse } from "../types";
import type { GigCapacityType, GigStatus } from "../types/gig";

const STATUS_LABELS: Record<GigStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  rejected: "Needs changes",
  published: "Published",
  closed: "Closed",
  unpublished: "Unpublished",
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    return ApiError.fromAxiosError(error as AxiosError<ApiResponse>).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong — please try again.";
};

type Dialog = "settings" | "close" | "reopen" | null;

export const PostedGigDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [capacityType, setCapacityType] = useState<GigCapacityType>("open");
  const [applicantLimit, setApplicantLimit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");

  const gigQuery = useQuery({
    queryKey: ["posted-gig", id],
    queryFn: () => getPostedGig(id),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["posted-gig", id] });
    queryClient.invalidateQueries({ queryKey: ["posted-gigs"] });
  };

  const submitMutation = useMutation({
    mutationFn: () => submitPostedGig(id),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deletePostedGig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posted-gigs"] });
      navigate("/feed/gigs/posted", { replace: true });
    },
  });
  const settingsMutation = useMutation({
    mutationFn: () =>
      updatePostedGigSettings(id, {
        capacity_type: capacityType,
        applicant_limit: capacityType === "limited" && applicantLimit ? Number(applicantLimit) : null,
        application_deadline: deadline || null,
      }),
    onSuccess: () => {
      invalidate();
      setDialog(null);
    },
    onError: (error) => setDialogError(getErrorMessage(error)),
  });
  const closeMutation = useMutation({
    mutationFn: () => closePostedGig(id, note.trim() || undefined),
    onSuccess: () => {
      invalidate();
      setDialog(null);
      setNote("");
    },
    onError: (error) => setDialogError(getErrorMessage(error)),
  });
  const reopenMutation = useMutation({
    mutationFn: () =>
      reopenPostedGig(id, {
        capacity_type: capacityType,
        applicant_limit: capacityType === "limited" && applicantLimit ? Number(applicantLimit) : null,
        application_deadline: deadline || null,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setDialog(null);
      setNote("");
    },
    onError: (error) => setDialogError(getErrorMessage(error)),
  });

  if (gigQuery.isLoading) {
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-3xl px-4 py-8">
          <div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </PageShell>
    );
  }

  if (!gigQuery.data) {
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-3xl px-4 py-8">
          <EmptyState
            title="This gig is no longer available"
            description="It may have been removed."
            action={
              <Link
                to="/feed/gigs/posted"
                className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
              >
                Back to my posted gigs
              </Link>
            }
          />
        </div>
      </PageShell>
    );
  }

  const gig = gigQuery.data;
  const { permissions } = gig;

  const openDialog = (type: Dialog) => {
    setDialogError(null);
    setCapacityType(gig.capacity_type);
    setApplicantLimit(gig.applicant_limit !== null ? String(gig.applicant_limit) : "");
    setDeadline(gig.application_deadline ? gig.application_deadline.slice(0, 10) : "");
    setNote("");
    setDialog(type);
  };

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/feed/gigs/posted"
          className="mb-6 inline-block text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back to my posted gigs
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">{gig.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">{gig.price_label}</p>
          </div>
          <span className="rounded-full bg-aquamarine-900 px-3 py-1 text-sm font-semibold text-aquamarine-200 dark:bg-aquamarine-100 dark:text-aquamarine-300">
            {STATUS_LABELS[gig.status]}
          </span>
        </div>

        {gig.status === "rejected" && gig.rejection_reason && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
            <p className="font-semibold">Needs changes</p>
            <p className="mt-0.5">{gig.rejection_reason}</p>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{gig.applicant_count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Interested</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {gig.spots_remaining ?? "∞"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Spots left</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {gig.worked_with_count ?? 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Worked with</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {permissions.can_submit && (
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="rounded-xl bg-aquamarine-500 px-4 py-2 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400 disabled:opacity-60"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit for approval"}
            </button>
          )}
          {permissions.can_edit && (
            <Link
              to={`/feed/gigs/posted/${gig.id}/edit`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Edit
            </Link>
          )}
          {permissions.can_view_applicants && (
            <Link
              to={`/feed/gigs/posted/${gig.id}/applicants`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Users className="h-4 w-4" aria-hidden />
              View applicants
            </Link>
          )}
          {permissions.can_manage_settings && (
            <button
              type="button"
              onClick={() => openDialog("settings")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Manage settings
            </button>
          )}
          {permissions.can_close && (
            <button
              type="button"
              onClick={() => openDialog("close")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Close
            </button>
          )}
          {permissions.can_reopen && (
            <button
              type="button"
              onClick={() => openDialog("reopen")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Reopen
            </button>
          )}
          {permissions.can_delete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this gig? This can't be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:bg-gray-800 dark:text-rose-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <BottomSheet
        open={dialog === "settings"}
        onClose={() => setDialog(null)}
        title="Manage settings"
        description="Change the applicant limit and/or deadline — no new review needed."
        footer={
          <button
            type="button"
            onClick={() => settingsMutation.mutate()}
            disabled={settingsMutation.isPending}
            className="w-full rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400 disabled:opacity-60"
          >
            {settingsMutation.isPending ? "Saving…" : "Save"}
          </button>
        }
      >
        <CapacityFields
          capacityType={capacityType}
          setCapacityType={setCapacityType}
          applicantLimit={applicantLimit}
          setApplicantLimit={setApplicantLimit}
          deadline={deadline}
          setDeadline={setDeadline}
          error={dialog === "settings" ? dialogError : null}
        />
      </BottomSheet>

      <BottomSheet
        open={dialog === "close"}
        onClose={() => setDialog(null)}
        title="Close this gig"
        description="It stays public as closed — every applicant and rating is kept."
        footer={
          <button
            type="button"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className="w-full rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400 disabled:opacity-60"
          >
            {closeMutation.isPending ? "Closing…" : "Close gig"}
          </button>
        }
      >
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          {dialogError && <p className="text-sm text-rose-600 dark:text-rose-400">{dialogError}</p>}
        </div>
      </BottomSheet>

      <BottomSheet
        open={dialog === "reopen"}
        onClose={() => setDialog(null)}
        title="Reopen this gig"
        description="It must leave the gig genuinely open — raise the limit or clear the deadline if needed."
        footer={
          <button
            type="button"
            onClick={() => reopenMutation.mutate()}
            disabled={reopenMutation.isPending}
            className="w-full rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400 disabled:opacity-60"
          >
            {reopenMutation.isPending ? "Reopening…" : "Reopen gig"}
          </button>
        }
      >
        <CapacityFields
          capacityType={capacityType}
          setCapacityType={setCapacityType}
          applicantLimit={applicantLimit}
          setApplicantLimit={setApplicantLimit}
          deadline={deadline}
          setDeadline={setDeadline}
          error={dialog === "reopen" ? dialogError : null}
          extra={
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          }
        />
      </BottomSheet>
    </PageShell>
  );
};

interface CapacityFieldsProps {
  capacityType: GigCapacityType;
  setCapacityType: (value: GigCapacityType) => void;
  applicantLimit: string;
  setApplicantLimit: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  error: string | null;
  extra?: ReactNode;
}

const CapacityFields = ({
  capacityType,
  setCapacityType,
  applicantLimit,
  setApplicantLimit,
  deadline,
  setDeadline,
  error,
  extra,
}: CapacityFieldsProps) => (
  <div className="space-y-4">
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        Capacity
      </label>
      <select
        value={capacityType}
        onChange={(e) => setCapacityType(e.target.value as GigCapacityType)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option value="open">Open (no limit)</option>
        <option value="limited">Limited</option>
      </select>
    </div>
    {capacityType === "limited" && (
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Applicant limit
        </label>
        <input
          type="number"
          min={1}
          value={applicantLimit}
          onChange={(e) => setApplicantLimit(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>
    )}
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        Application deadline
      </label>
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
    </div>
    {extra}
    {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
  </div>
);
