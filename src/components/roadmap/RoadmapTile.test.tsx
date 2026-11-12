import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RoadmapTile } from "./RoadmapTile";
import type { Roadmap } from "../../types/roadmap";

const roadmap = (overrides: Partial<Roadmap> = {}): Roadmap => ({
  id: 1,
  uuid: "u",
  slug: "se-path",
  title: "Software Engineering Path",
  description: "From first program to deployed app.",
  thumbnail_url: null,
  published_at: null,
  level: null,
  semester: null,
  university: null,
  faculty: null,
  department: null,
  organization: null,
  total_courses: 8,
  is_participant: false,
  is_completed: false,
  progress: null,
  current_course: null,
  badge: null,
  ...overrides,
});

const renderTile = (r: Roadmap, recommended = false) =>
  render(
    <MemoryRouter>
      <RoadmapTile roadmap={r} recommended={recommended} />
    </MemoryRouter>
  );

describe("RoadmapTile", () => {
  it("is one link to the journey, with title, blurb and course count", () => {
    renderTile(roadmap());

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/roadmaps/se-path");
    expect(link).toHaveTextContent("Software Engineering Path");
    expect(link).toHaveTextContent("From first program to deployed app.");
    expect(link).toHaveTextContent("8-course roadmap");
  });

  it("shows progress for a participant", () => {
    renderTile(
      roadmap({
        is_participant: true,
        progress: { completed_courses: 3, total_courses: 8, percent: 37.5 },
      })
    );

    expect(screen.getByText("3 of 8 courses · 38% complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /progress/ })).toHaveAttribute("aria-valuenow", "38");
  });

  it("flags completed and recommended roadmaps", () => {
    const { unmount } = renderTile(roadmap({ is_participant: true, is_completed: true }));
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    unmount();

    renderTile(roadmap(), true);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("never exposes the internal relevance score", () => {
    renderTile(roadmap({ relevance_score: 42 }));
    expect(screen.queryByText(/42/)).not.toBeInTheDocument();
    expect(screen.queryByText(/relevance|score/i)).not.toBeInTheDocument();
  });

  it("uses a branded fallback cover when there is no thumbnail", () => {
    const { container } = renderTile(roadmap());
    // No <img> to break: an inline SVG cover with the title's monogram.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container).toHaveTextContent("SEP");
  });

  it("uses the thumbnail when there is one", () => {
    const { container } = renderTile(roadmap({ thumbnail_url: "https://cdn.example/rm.jpg" }));
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example/rm.jpg");
  });
});
