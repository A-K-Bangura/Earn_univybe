import { useState, useEffect, useRef } from "react";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Share2,
  AlertCircle,
  MessageCircle,
  User,
  Lock,
  BookOpen,
  Coins,
  X,
} from "lucide-react";
import { DiscoveryToolbar } from "../components/discovery/DiscoveryToolbar";
import { FilterSelect } from "../components/discovery/FilterSelect";
import {
  getFeedPosts,
  toggleLikePost,
  sharePost,
  commentOnPost,
  getPostDetail,
  getRemainingFeedTime,
  exchangeXpForFeedTime,
  endFeedSession,
  isFeedLockedError,
} from "../services/feed";
import { getDashboard } from "../services/dashboard";
import { searchPosts } from "../services/search";
import { formatRelativeTime } from "../utils/format";
import { getCurrentUser, isAuthenticated } from "../services/auth";
import { requireAuthOrRedirect } from "../utils/guestGuard";
import { GuestBanner } from "../components/common/GuestBanner";
import type {
  FeedFilters,
  PostType,
  PostAuthor,
  FeedPost,
  PostComment,
} from "../types/feed";
import type { PaginatedResponse } from "../types";
import type { PostSearchItem } from "../types/search";

type FeedPages = InfiniteData<PaginatedResponse<FeedPost>>;

/** Applies `update` to one post in every loaded page of the infinite feed cache. */
const updateFeedPost = (
  data: FeedPages,
  postId: number,
  update: (post: FeedPost) => FeedPost
): FeedPages => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    data: page.data.map((p) => (p.id === postId ? update(p) : p)),
  })),
});

/**
 * The feed endpoints return no `name` for authors or commenters — build one
 * from `display_name` / `firstname` / `lastname` (STUDENT_API_PAYLOADS §41, §44).
 */
type NamedPerson = Pick<
  PostAuthor,
  "display_name" | "name" | "firstname" | "lastname"
>;

const getDisplayName = (
  person: NamedPerson | null | undefined,
  fallback: string
): string =>
  person?.display_name ||
  person?.name ||
  `${person?.firstname ?? ""} ${person?.lastname ?? ""}`.trim() ||
  fallback;

export const Feed = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FeedFilters>({
    per_page: 15,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );
  const [activeAuthor, setActiveAuthor] = useState<PostAuthor | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [feedLocked, setFeedLocked] = useState(false);
  const feedTimeIntervalRef = useRef<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Check feed time on mount — feed-time balance is a per-student concept,
  // so this (and the lock it drives) never applies to a guest.
  const { data: feedTime, refetch: refetchFeedTime } = useQuery({
    queryKey: ["feed-time"],
    queryFn: getRemainingFeedTime,
    retry: false,
    enabled: isAuthenticated(),
  });

  // Check if feed is locked
  useEffect(() => {
    if (feedTime) {
      const isLocked =
        !feedTime.unlimited &&
        (feedTime.seconds === null || feedTime.seconds <= 0);
      setFeedLocked(isLocked);
      setShowLockModal(isLocked);
    }
  }, [feedTime]);

  // Ensure the student still has access to the feed before gated actions
  const ensureFeedAccess = async (): Promise<boolean> => {
    try {
      const result = await refetchFeedTime();
      const latest = result.data ?? feedTime;

      if (!latest) return true; // fail-open if we can't determine

      const isLocked =
        !latest.unlimited &&
        (latest.seconds === null || latest.seconds <= 0);

      if (isLocked) {
        setFeedLocked(true);
        setShowLockModal(true);
        return false;
      }

      return true;
    } catch {
      // On error, keep current state and allow action (don't hard-block UX)
      return !feedLocked;
    }
  };

  // Periodically refresh remaining feed time while on the Feed page
  useEffect(() => {
    // If we don't yet have feedTime data, don't start an interval
    if (!feedTime) return;

    // Always do an immediate refetch when this effect runs
    refetchFeedTime();

    // Clear any existing interval before creating a new one
    if (feedTimeIntervalRef.current !== null) {
      window.clearInterval(feedTimeIntervalRef.current);
      feedTimeIntervalRef.current = null;
    }

    // Only start polling when access is not unlimited
    if (!feedTime.unlimited) {
      const intervalId = window.setInterval(() => {
        refetchFeedTime();
      }, 5 * 60 * 1000); // 5 minutes

      feedTimeIntervalRef.current = intervalId;
    }

    // Cleanup when dependencies change or component unmounts
    return () => {
      if (feedTimeIntervalRef.current !== null) {
        window.clearInterval(feedTimeIntervalRef.current);
        feedTimeIntervalRef.current = null;
      }
    };
  }, [feedTime, refetchFeedTime]);

  // End feed session when leaving the Feed page
  useEffect(() => {
    return () => {
      // Clear any remaining interval
      if (feedTimeIntervalRef.current !== null) {
        window.clearInterval(feedTimeIntervalRef.current);
        feedTimeIntervalRef.current = null;
      }

      // Feed sessions are a per-student concept — nothing to end for a guest,
      // and this endpoint still requires auth.
      if (isAuthenticated()) {
        // Fire and forget; errors are swallowed to avoid blocking navigation
        endFeedSession().catch(() => {
          // no-op
        });
      }
    };
  }, []);

  // Regular feed posts query (when not searching) with infinite scroll
  const {
    data: feedData,
    isLoading: isLoadingPosts,
    error: feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<
    PaginatedResponse<FeedPost>,
    Error,
    InfiniteData<PaginatedResponse<FeedPost>>,
    [string, FeedFilters],
    number
  >({
    queryKey: ["feed-posts", filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      try {
        return await getFeedPosts({
          ...filters,
          page: pageParam,
        });
      } catch (error) {
        // Handle FEED_LOCKED error
        if (isFeedLockedError(error)) {
          setFeedLocked(true);
          setShowLockModal(true);
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current_page >= lastPage.last_page) return undefined;
      return lastPage.current_page + 1;
    },
    enabled: !isSearchMode || !searchQuery.trim(),
    retry: (failureCount, error) => {
      // Don't retry on FEED_LOCKED errors
      if (isFeedLockedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Handle feed error separately
  useEffect(() => {
    if (isFeedLockedError(feedError)) {
      setFeedLocked(true);
      setShowLockModal(true);
    }
  }, [feedError]);

  // Search posts query (when searching)
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["search-posts", searchQuery, filters.type, searchOffset],
    queryFn: () =>
      searchPosts(searchQuery, {
        type: filters.type,
        limit: filters.per_page || 15,
        offset: searchOffset,
      }),
    enabled: isSearchMode && !!searchQuery.trim(),
  });

  // Helper function to convert PostSearchItem to FeedPost format
  const convertSearchItemToPost = (item: PostSearchItem): FeedPost => {
    return {
      id: item.id,
      title: item.title,
      content_text: item.content_text,
      type: item.type as PostType,
      tags: item.tags,
      author: item.author,
      likes_count: item.likes_count,
      comments_count: item.comments_count,
      has_liked: false, // Search results may not include this
      created_at: "", // Search results may not include this
    };
  };

  // Like mutation with optimistic updates (supports infinite feed pages)
  const likeMutation = useMutation({
    mutationFn: toggleLikePost,
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: ["feed-posts"] });
      const previous = queryClient.getQueryData<FeedPages>([
        "feed-posts",
        filters,
      ]);

      if (previous) {
        queryClient.setQueryData<FeedPages>(
          ["feed-posts", filters],
          updateFeedPost(previous, postId, (p) => ({
            ...p,
            has_liked: !p.has_liked,
            likes_count: p.has_liked
              ? Math.max(0, (p.likes_count || 0) - 1)
              : (p.likes_count || 0) + 1,
          }))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["feed-posts", filters], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  // Share mutation with optimistic updates (supports infinite feed pages)
  const shareMutation = useMutation({
    mutationFn: (postId: number) => sharePost(postId),
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: ["feed-posts"] });
      const previous = queryClient.getQueryData<FeedPages>([
        "feed-posts",
        filters,
      ]);

      if (previous) {
        queryClient.setQueryData<FeedPages>(
          ["feed-posts", filters],
          updateFeedPost(previous, postId, (p) => ({
            ...p,
            shares_count: (p.shares_count || 0) + 1,
          }))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["feed-posts", filters], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  const handleLike = (postId: number) => {
    if (!requireAuthOrRedirect(navigate)) return;
    void (async () => {
      const canAccess = await ensureFeedAccess();
      if (!canAccess) return;
      likeMutation.mutate(postId);
    })();
  };

  const handleShare = async (post: FeedPost) => {
    if (!requireAuthOrRedirect(navigate)) return;
    const canAccess = await ensureFeedAccess();
    if (!canAccess) return;

    const url = post.slug
      ? `${window.location.origin}/feed/${post.slug}`
      : `${window.location.origin}/feed/${post.id}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          url,
          title: post.title,
          text: post.content_text,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      shareMutation.mutate(post.id);
    } catch {
      // ignore
    }
  };

  // Add comment mutation (updates the correct post in all loaded pages)
  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) =>
      commentOnPost(postId, content),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<FeedPages>(["feed-posts", filters], (oldData) => {
        if (!oldData) return oldData;

        return updateFeedPost(oldData, variables.postId, (p) => {
          const nextComments = [...(p.comments || []), data.comment];
          return {
            ...p,
            comments: nextComments,
            comments_count: p.comments_count || nextComments.length,
          };
        });
      });

      // clear input
      setCommentInputs((s) => ({ ...s, [variables.postId]: "" }));
    },
  });

  const submitSearch = () => {
    if (searchQuery.trim()) {
      setIsSearchMode(true);
      setSearchOffset(0);
    } else {
      setIsSearchMode(false);
      setSearchOffset(0);
    }
  };

  const handleClearSearch = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setSearchOffset(0);
  };

  const handleFilterChange = (
    key: keyof FeedFilters,
    value: string | boolean | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const resetFeedFilters = () => {
    setSearchQuery("");
    setIsSearchMode(false);
    setSearchOffset(0);
    setFilters({ per_page: 15 });
  };

  const activeFeedFilterCount = [
    searchQuery.trim(),
    filters.type,
    filters.sort_by && filters.sort_by !== "created_at",
    filters.sort_order && filters.sort_order !== "desc",
  ].filter(Boolean).length;

  // XP exchange mutation
  const exchangeXpMutation = useMutation({
    mutationFn: (xp: number) => {
      // Generate a unique client event ID for idempotency
      const clientEventId = crypto.randomUUID();
      return exchangeXpForFeedTime(xp, clientEventId);
    },
    onSuccess: () => {
      // Refetch feed time and feed posts
      refetchFeedTime();
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      setShowLockModal(false);
      setFeedLocked(false);
    },
  });

  // Get current user for XP check
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    retry: 1,
    enabled: isAuthenticated(),
  });

  const currentUser = getCurrentUser();
  const userXP =
    dashboardData?.student?.total_xp ??
    currentUser?.xp_total ??
    0;
  const canExchangeXP = userXP >= 10;

  // Handler functions
  const handleGoToCourses = () => {
    navigate("/courses");
  };

  const handleExchangeXP = () => {
    if (canExchangeXP) {
      exchangeXpMutation.mutate(10); // Exchange 10 XP for 10 minutes
    }
  };

  // Format remaining time
  const formatRemainingTime = (seconds: number | null): string => {
    if (seconds === null) return "Unlimited";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor(
      (seconds % 3600) / 60
    )}m`;
  };

  // Determine which posts to display
  const posts =
    isSearchMode && searchResults
      ? searchResults.results.map(convertSearchItemToPost)
      : feedData?.pages.flatMap(
          (page: PaginatedResponse<FeedPost>) => page.data
        ) || [];

  // Automatically load more posts when the user reaches the bottom sentinel
  useEffect(() => {
    if (isSearchMode) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isLoadingPosts &&
          !feedLocked
        ) {
          void fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 1.0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isSearchMode,
    isLoadingPosts,
    feedLocked,
  ]);

  const isLoadingFeed = isSearchMode ? isSearchLoading : isLoadingPosts;

  return (
    <>
    <div className="max-w-4xl mx-auto">
      <GuestBanner />
      {/* Remaining Time — the heading/subtitle above this is now owned by FeedShell */}
      {feedTime && !feedTime.unlimited && (
        <div className="mb-8 text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Remaining Time
          </div>
          <div className="text-lg font-semibold text-azure-500">
            {formatRemainingTime(feedTime.seconds)}
          </div>
        </div>
      )}

        {/* Search and Filters — same DiscoveryToolbar used by Opportunities/Gigs */}
        <DiscoveryToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={submitSearch}
          searchPlaceholder="Search posts..."
          searchLabel="Search posts"
          primary={
            <>
              <FilterSelect
                label="Type"
                value={filters.type || ""}
                onChange={(value) =>
                  handleFilterChange("type", (value || undefined) as PostType | undefined)
                }
                options={[
                  { value: "question", label: "Questions" },
                  { value: "announcement", label: "Announcements" },
                  { value: "discussion", label: "Discussions" },
                  { value: "tip", label: "Tips" },
                  { value: "meme", label: "Memes" },
                ]}
                placeholder="All Types"
              />
              <FilterSelect
                label="Sort By"
                value={filters.sort_by || "created_at"}
                onChange={(value) =>
                  handleFilterChange(
                    "sort_by",
                    value as "created_at" | "popularity" | undefined
                  )
                }
                options={[
                  { value: "created_at", label: "Date Created" },
                  { value: "popularity", label: "Popularity" },
                ]}
                placeholder="Date Created"
              />
              <FilterSelect
                label="Sort Order"
                value={filters.sort_order || "desc"}
                onChange={(value) =>
                  handleFilterChange("sort_order", value as "asc" | "desc" | undefined)
                }
                options={[
                  { value: "desc", label: "Descending" },
                  { value: "asc", label: "Ascending" },
                ]}
                placeholder="Descending"
              />
            </>
          }
          activeCount={activeFeedFilterCount}
          onReset={resetFeedFilters}
          sheetTitle="Filter feed"
        />

        {/* Search Results Header */}
        {isSearchMode && searchQuery && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Search Results for "{searchQuery}"
              </h2>
              {searchResults && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchResults.total} result
                  {searchResults.total !== 1 ? "s" : ""} found
                </p>
              )}
              <button
                onClick={handleClearSearch}
                className="text-azure-500 hover:text-azure-600 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        {isLoadingFeed ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3" />
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex items-center justify-center"
                    onClick={() => setActiveAuthor(post.author || null)}
                    title={getDisplayName(post.author, "Author")}
                  >
                    {post?.author?.avatar_url ? (
                      <img
                        src={post.author.avatar_url}
                        alt={getDisplayName(post.author, "Author")}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500 rounded-full" />
                    )}
                  </button>
                  <div>
                    <button
                      onClick={() => setActiveAuthor(post.author || null)}
                      className="font-semibold text-gray-900 dark:text-white hover:underline"
                    >
                      {getDisplayName(post.author, "Unknown Author")}
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatRelativeTime(new Date(post.created_at))} •{" "}
                      {post.type}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  {post.title && (
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {post.title}
                    </h3>
                  )}
                  {/* The API sends the same body as both `content_html` and
                      `content_text` (§41) — render one, preferring the rich
                      HTML. Search results only carry `content_text`. */}
                  {post.content_html ? (
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: post.content_html }}
                    />
                  ) : (
                    post.content_text && (
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {post.content_text}
                      </p>
                    )
                  )}
                  {post.media_url && (
                    <div className="mt-4">
                      <img
                        src={post.media_url}
                        alt={post.title || "Post media"}
                        className="w-full rounded-lg object-cover max-h-96"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        loading="lazy"
                      />
                      {post.media_metadata && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {post.media_metadata.format?.toUpperCase()}
                          {post.media_metadata.size &&
                            ` • ${post.media_metadata.size}`}
                          {post.media_metadata.width &&
                            post.media_metadata.height &&
                            ` • ${post.media_metadata.width}×${post.media_metadata.height}`}
                        </p>
                      )}
                    </div>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300 rounded text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleLike(post.id)}
                    disabled={likeMutation.isPending}
                    className={`flex items-center gap-2 transition-colors ${
                      post.has_liked
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        post.has_liked ? "fill-current" : ""
                      }`}
                    />
                    <span className="font-medium">{post.likes_count}</span>
                  </button>
                  <button
                    onClick={async () => {
                      const next = !expandedComments[post.id];
                      setExpandedComments((s) => ({ ...s, [post.id]: next }));
                      if (
                        next &&
                        (!post.comments || post.comments.length === 0)
                      ) {
                        try {
                          const detail = await getPostDetail(post.id);
                          queryClient.setQueryData<FeedPages>(
                            ["feed-posts", filters],
                            (oldData) =>
                              oldData &&
                              updateFeedPost(oldData, post.id, (p) => ({
                                ...p,
                                comments: detail.comments || [],
                              }))
                          );
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">
                      {post.comments_count || post.comments?.length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => handleShare(post)}
                    disabled={shareMutation.isPending}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">
                      {post.shares_count || 0}
                    </span>
                  </button>
                  {post.views_count !== undefined && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                      {post.views_count} views
                    </span>
                  )}
                </div>

                {/* Comments Section */}
                {expandedComments[post.id] && (
                  <div className="mt-4 space-y-4">
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {post.comments.map((c: PostComment) => (
                          <div key={c.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                              {c.user?.avatar_url ? (
                                <img
                                  src={c.user.avatar_url}
                                  alt={getDisplayName(c.user, "User")}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {getDisplayName(c.user, "User")}
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {c.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No comments yet. Be the first to comment.
                      </p>
                    )}

                    <form
                      className="flex items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const content = (commentInputs[post.id] || "").trim();
                        if (!content) return;
                        if (!requireAuthOrRedirect(navigate)) return;

                        const canAccess = await ensureFeedAccess();
                        if (!canAccess) return;

                        addCommentMutation.mutate({ postId: post.id, content });
                      }}
                    >
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((s) => ({
                            ...s,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      />
                      <button
                        type="submit"
                        disabled={addCommentMutation.isPending}
                        className="px-4 py-2 bg-azure-500 text-white rounded-lg hover:bg-azure-600 disabled:opacity-50"
                      >
                        Comment
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {/* Infinite scroll status (only for regular feed, not search) */}
            {!isSearchMode && (
              <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {isFetchingNextPage && <span>Loading more posts...</span>}
                {!hasNextPage && !isFetchingNextPage && (
                  <span>You're all caught up.</span>
                )}
              </div>
            )}

            {/* Search Pagination */}
            {isSearchMode &&
              searchResults &&
              searchResults.total > (filters.per_page || 15) && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() =>
                      setSearchOffset((prev) =>
                        Math.max(0, prev - (filters.per_page || 15))
                      )
                    }
                    disabled={searchOffset === 0}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="px-4 py-2 bg-azure-500 text-white rounded-lg">
                    Showing {searchOffset + 1}-
                    {Math.min(
                      searchOffset + (filters.per_page || 15),
                      searchResults.total
                    )}{" "}
                    of {searchResults.total}
                  </div>
                  <button
                    onClick={() =>
                      setSearchOffset((prev) => prev + (filters.per_page || 15))
                    }
                    disabled={
                      searchOffset + (filters.per_page || 15) >=
                      searchResults.total
                    }
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back soon for updates and tips!
            </p>
          </div>
        )}
        {/* Sentinel for infinite scroll (only used in non-search mode) */}
        {!isSearchMode && (
          <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
        )}
      </div>

      {/* Author Modal */}
      {activeAuthor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-300"
              onClick={() => setActiveAuthor(null)}
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                {activeAuthor.avatar_url ? (
                  <img
                    src={activeAuthor.avatar_url}
                    alt={getDisplayName(activeAuthor, "Author")}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-gray-500" />
                )}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900 dark:text-white">
                  {getDisplayName(activeAuthor, "Author")}
                </div>
                {activeAuthor.role?.name && (
                  <div className="text-sm text-gray-500">
                    {activeAuthor.role.name}
                  </div>
                )}
                {activeAuthor.university?.name && (
                  <div className="text-sm text-gray-500">
                    {activeAuthor.university.name}
                  </div>
                )}
              </div>
            </div>
            {activeAuthor.bio && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {activeAuthor.bio}
              </p>
            )}
            {activeAuthor.social_links && (
              <div className="mt-4 space-y-1 text-sm text-azure-600 dark:text-azure-400">
                {Object.entries(activeAuthor.social_links).map(
                  ([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="font-medium">{k}: </span>
                      <a
                        href={String(v)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {String(v)}
                      </a>
                    </div>
                  )
                )}
              </div>
            )}
            <div className="mt-4 text-right">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium"
                onClick={() => setActiveAuthor(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Lock Modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                  <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Feed Locked
                </h2>
              </div>
              <button
                onClick={() => setShowLockModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Feed locked — complete a lesson or exchange 10 XP to gain access.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleGoToCourses}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                Go to Courses
              </button>

              <button
                onClick={handleExchangeXP}
                disabled={!canExchangeXP || exchangeXpMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                <Coins className="w-5 h-5" />
                {exchangeXpMutation.isPending
                  ? "Exchanging..."
                  : canExchangeXP
                  ? "Exchange 10 XP (10 minutes)"
                  : `Insufficient XP (Need 10, Have ${userXP})`}
              </button>
            </div>

            {!canExchangeXP && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Complete lessons to earn XP, then exchange it for feed time!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Feed Lock Overlay - blocks interaction when locked */}
      {feedLocked && !showLockModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm text-center border border-gray-200 dark:border-gray-700">
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Feed Locked
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete a lesson or exchange XP to unlock the feed.
            </p>
            <button
              onClick={() => setShowLockModal(true)}
              className="px-4 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
            >
              Unlock Feed
            </button>
          </div>
        </div>
      )}
    </>
  );
};
