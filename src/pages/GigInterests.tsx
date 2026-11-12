import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { AxiosError } from "axios";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { BottomSheet } from "../components/common/BottomSheet";
import { RatingStars } from "../components/gigs/RatingStars";
import { getGigInterests, getGigOptions, rateGigCreator } from "../services/gigs";
import { ApiError } from "../utils/apiError";
import type { ApiResponse } from "../types";
import type { GigInterestListItem, UnavailableGigInterestListItem } from "../types/gig";
import { formatDate } from "../utils/format";

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Worked with" },
  { value: "false", label: "Not yet" },
] as const;

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    return ApiError.fromAxiosError(error as AxiosError<ApiResponse>).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong — please try again.";
};

const isUnavailable = (
  item: GigInterestListItem | UnavailableGigInterestListItem
): item is UnavailableGigInterestListItem => item.availability === "unavailable";

export const GigInterests = () => {
  const queryClient = useQueryClient();
  const [workedWithFilter, setWorkedWithFilter] = useState("");
  const [ratingTarget, setRatingTarget] = useState<GigInterestListItem | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["gig-options"],
    queryFn: getGigOptions,
    staleTime: 60 * 60 * 1000,
  });

  const interestsQuery = useQuery({
    queryKey: [
      "gig-interests",
      workedWithFilter === "" ? undefined : workedWithFilter === "true",
    ],
    queryFn: () =>
      getGigInterests({
        worked_with: workedWithFilter === "" ? undefined : workedWithFilter === "true",
      }),
  });

  const rateMutation = useMutation({
    mutationFn: ({ gigId, body }: { gigId: number; body: { rating: number; review?: string } }) =>
      rateGigCreator(gigId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-interests"] });
      setRatingTarget(null);
    },
    onError: (error) => setRateError(getErrorMessage(error)),
  });

  const openRatingDialog = (item: GigInterestListItem) => {
    setRating(item.rating_given?.rating ?? 0);
    setReview(item.rating_given?.review ?? "");
    setRateError(null);
    setRatingTarget(item);
  };

  const submitRating = () => {
    if (!ratingTarget || rating === 0) return;
    rateMutation.mutate({
      gigId: ratingTarget.gig.id,
      body: { rating, review: review.trim() || undefined },
    });
  };

  const items = interestsQuery.data?.data ?? [];

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">My interests</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gigs you've shown interest in — contact details are never shown here; use "Contact
            again" to get a fresh link.
          </p>
        </header>

        <div className="mb-6 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setWorkedWithFilter(option.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                workedWithFilter === option.value
                  ? "bg-white text-aquamarine-200 shadow-sm dark:bg-gray-700 dark:text-aquamarine-300"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {interestsQuery.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No gig interests yet"
            description="Browse gigs and tap Interested to get started."
            action={
              <Link
                to="/feed/gigs"
                className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
              >
                Browse gigs
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              if (isUnavailable(item)) {
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <p className="font-semibold text-gray-500 dark:text-gray-400">{item.gig.title}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">No longer available</p>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/feed/gigs/${item.gig.uuid}`}
                        className="font-semibold text-gray-900 hover:text-aquamarine-200 dark:text-white"
                      >
                        {item.gig.title}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Interested on {formatDate(new Date(item.interested_at))} ·{" "}
                        {item.availability === "open" ? "Open" : "Closed"}
                      </p>
                      {item.worked_with && (
                        <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          Worked with
                        </p>
                      )}
                      {item.rating_received && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          They rated you: <RatingStars value={item.rating_received.rating} size="sm" />
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Link
                        to={`/feed/gigs/${item.gig.uuid}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-aquamarine-200 hover:text-aquamarine-300"
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden />
                        Contact again
                      </Link>
                      {item.can_rate_creator && (
                        <button
                          type="button"
                          onClick={() => openRatingDialog(item)}
                          className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {item.rating_given ? "Edit your rating" : "Rate creator"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet
        open={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        title="Rate the creator"
        description={ratingTarget ? ratingTarget.gig.title : undefined}
      >
        <div className="space-y-4">
          <RatingStars value={rating || null} onChange={setRating} label="Your rating" />
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
              Review (optional)
            </label>
            <textarea
              value={review}
              onChange={(event) => setReview(event.target.value)}
              maxLength={options?.rating.review_max_length ?? 1000}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {rateError && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {rateError}
            </p>
          )}
          <button
            type="button"
            onClick={submitRating}
            disabled={rating === 0 || rateMutation.isPending}
            className="w-full rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rateMutation.isPending ? "Saving…" : "Save rating"}
          </button>
        </div>
      </BottomSheet>
    </PageShell>
  );
};
