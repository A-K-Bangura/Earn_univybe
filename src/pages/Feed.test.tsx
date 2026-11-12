import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, type AxiosResponse } from "axios";
import type { PaginatedResponse } from "../types";
import type { FeedPost, PostDetail } from "../types/feed";

// --- Module mocks ----------------------------------------------------------
// The page's network and auth dependencies are replaced; everything else
// (React Query cache handling, rendering) runs for real.

vi.mock("../components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../services/auth", () => ({
  isAuthenticated: () => true,
  getCurrentUser: () => ({ id: 12, email: "john@example.com", xp_total: 50 }),
}));

vi.mock("../services/dashboard", () => ({
  getDashboard: vi.fn().mockResolvedValue({ student: { total_xp: 50 } }),
}));

vi.mock("../services/search", () => ({ searchPosts: vi.fn() }));

vi.mock("../services/feed", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/feed")>()),
  getFeedPosts: vi.fn(),
  getPostDetail: vi.fn(),
  getRemainingFeedTime: vi
    .fn()
    .mockResolvedValue({ seconds: 1500, unlimited: false }),
  endFeedSession: vi.fn().mockResolvedValue(undefined),
}));

import { Feed } from "./Feed";
import { getFeedPosts, getPostDetail } from "../services/feed";

// --- Fixtures (shapes taken from docs/STUDENT_API_PAYLOADS.md §41 / §44) ----

// §41: the author has no `name` and `display_name` may be null.
const post: FeedPost = {
  id: 1,
  uuid: "post-1",
  type: "tip",
  title: "Study Tip",
  content_text: "Review your notes within 24 hours.",
  tags: ["study-tips"],
  likes_count: 12,
  comments_count: 7,
  shares_count: 3,
  views_count: 200,
  has_liked: false,
  created_at: "2026-09-24T10:00:00.000000Z",
  author: {
    id: 3,
    firstname: "Amara",
    lastname: "Kamara",
    display_name: undefined,
    avatar_url: null,
    bio: null,
    social_links: null,
    university: { id: 1, name: "University of Sierra Leone" },
    role: { id: 2, name: "tutor" },
  },
};

const page = (posts: FeedPost[]): PaginatedResponse<FeedPost> => ({
  current_page: 1,
  data: posts,
  first_page_url: null,
  from: 1,
  last_page: 1,
  last_page_url: null,
  links: [],
  next_page_url: null,
  path: "/student/feed",
  per_page: 15,
  prev_page_url: null,
  to: posts.length,
  total: posts.length,
});

// §44: comments[].user is reduced to {id, uuid, firstname, lastname, avatar_url}.
const detail: PostDetail = {
  ...post,
  comments: [
    {
      id: 8,
      content: "Great explanation, thanks!",
      is_approved: true,
      created_at: "2026-09-25T09:00:00.000000Z",
      user: {
        id: 12,
        uuid: "user-12",
        firstname: "John",
        lastname: "Doe",
        avatar_url: null,
      },
    },
  ],
};

const renderFeed = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Feed />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Feed page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no IntersectionObserver (used for infinite scroll).
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  it("builds the author's name from firstname/lastname when the API sends no `name`", async () => {
    vi.mocked(getFeedPosts).mockResolvedValue(page([post]));

    renderFeed();

    // Both the avatar button (title) and the name button resolve to the name.
    expect(
      await screen.findAllByRole("button", { name: "Amara Kamara" })
    ).toHaveLength(2);
    expect(screen.queryByText("Unknown Author")).not.toBeInTheDocument();
  });

  it("renders a post body once when the API sends both content_html and content_text", async () => {
    // §41 returns the same body in both fields.
    vi.mocked(getFeedPosts).mockResolvedValue(
      page([
        {
          ...post,
          content_html: "<p>Review your notes within 24 hours.</p>",
          content_text: "Review your notes within 24 hours.",
        },
      ])
    );

    renderFeed();
    await screen.findByText("Study Tip");

    expect(screen.getAllByText("Review your notes within 24 hours.")).toHaveLength(1);
  });

  it("falls back to content_text when a post has no content_html (e.g. search results)", async () => {
    vi.mocked(getFeedPosts).mockResolvedValue(
      page([{ ...post, content_html: undefined }])
    );

    renderFeed();

    expect(
      await screen.findByText("Review your notes within 24 hours.")
    ).toBeInTheDocument();
  });

  it("loads and shows comments into the infinite-feed cache when the comment button is clicked", async () => {
    vi.mocked(getFeedPosts).mockResolvedValue(page([post]));
    vi.mocked(getPostDetail).mockResolvedValue(detail);
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Study Tip");

    // The comment-count button is the one showing the post's comments_count.
    await user.click(screen.getByRole("button", { name: "7" }));

    expect(getPostDetail).toHaveBeenCalledWith(1);
    expect(
      await screen.findByText("Great explanation, thanks!")
    ).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows the lock modal when the feed answers 403 FEED_LOCKED", async () => {
    // §41: { success: false, error: { code: "FEED_LOCKED", ... } }
    vi.mocked(getFeedPosts).mockRejectedValue(
      new AxiosError(
        "Request failed with status code 403",
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        {
          status: 403,
          data: {
            success: false,
            error: { code: "FEED_LOCKED", message: "Feed locked" },
          },
        } as AxiosResponse
      )
    );

    renderFeed();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Feed Locked" })
      ).toBeInTheDocument()
    );
  });
});
