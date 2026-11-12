import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { CheckCircle2 } from "lucide-react";
import { BottomSheet } from "../common/BottomSheet";
import { RatingStars } from "./RatingStars";
import { rateApplicant, setApplicantWorkedWith } from "../../services/gigs";
import { ApiError } from "../../utils/apiError";
import type { ApiResponse } from "../../types";
import type { GigApplicant, PostedGigPermissions } from "../../types/gig";
import { formatDate } from "../../utils/format";

interface GigApplicantsTableProps {
  gigId: string | number;
  applicants: GigApplicant[];
  permissions: PostedGigPermissions;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    return ApiError.fromAxiosError(error as AxiosError<ApiResponse>).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong — please try again.";
};

export const GigApplicantsTable = ({ gigId, applicants, permissions }: GigApplicantsTableProps) => {
  const queryClient = useQueryClient();
  const [ratingTarget, setRatingTarget] = useState<GigApplicant | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["gig-applicants", gigId] });

  const workedWithMutation = useMutation({
    mutationFn: ({ interestId, value }: { interestId: string; value: boolean }) =>
      setApplicantWorkedWith(gigId, interestId, value),
    onSuccess: invalidate,
    onError: (error, variables) =>
      setRowError((prev) => ({ ...prev, [variables.interestId]: getErrorMessage(error) })),
  });

  const rateMutation = useMutation({
    mutationFn: ({ interestId, body }: { interestId: string; body: { rating: number; review?: string } }) =>
      rateApplicant(gigId, interestId, body),
    onSuccess: () => {
      invalidate();
      setRatingTarget(null);
    },
    onError: (error) =>
      setRowError((prev) => ({ ...prev, [ratingTarget?.id ?? ""]: getErrorMessage(error) })),
  });

  const openRatingDialog = (applicant: GigApplicant) => {
    setRating(applicant.rating_given?.rating ?? 0);
    setReview(applicant.rating_given?.review ?? "");
    setRatingTarget(applicant);
  };

  return (
    <>
      <div className="space-y-3">
        {applicants.map((applicant) => (
          <div
            key={applicant.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start gap-3">
              {applicant.student.avatar_url ? (
                <img
                  src={applicant.student.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {applicant.student.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{applicant.student.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {applicant.student.university?.name ?? applicant.student.organization?.name}
                  {applicant.student.level ? ` · Level ${applicant.student.level}` : ""}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Interested on {formatDate(new Date(applicant.interested_at))}
                </p>
                {applicant.student.gig_rating?.rating_count ? (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <RatingStars value={applicant.student.gig_rating.average_rating} size="sm" />(
                    {applicant.student.gig_rating.rating_count})
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {permissions.can_rate_workers && (
                <button
                  type="button"
                  onClick={() =>
                    workedWithMutation.mutate({
                      interestId: applicant.id,
                      value: !applicant.worked_with,
                    })
                  }
                  disabled={workedWithMutation.isPending}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    applicant.worked_with
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {applicant.worked_with ? "Worked with" : "Mark worked with"}
                </button>
              )}
              {permissions.can_rate_workers && applicant.worked_with && (
                <button
                  type="button"
                  onClick={() => openRatingDialog(applicant)}
                  className="text-sm font-semibold text-aquamarine-200 hover:text-aquamarine-300"
                >
                  {applicant.rating_given ? "Edit rating" : "Rate"}
                </button>
              )}
              {rowError[applicant.id] && (
                <p className="max-w-48 text-right text-xs text-rose-600 dark:text-rose-400">
                  {rowError[applicant.id]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomSheet
        open={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        title="Rate this student"
        description={ratingTarget?.student.name}
      >
        <div className="space-y-4">
          <RatingStars value={rating || null} onChange={setRating} label="Rating" />
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            placeholder="Optional review"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() =>
              ratingTarget &&
              rateMutation.mutate({
                interestId: ratingTarget.id,
                body: { rating, review: review.trim() || undefined },
              })
            }
            disabled={rating === 0 || rateMutation.isPending}
            className="w-full rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rateMutation.isPending ? "Saving…" : "Save rating"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
