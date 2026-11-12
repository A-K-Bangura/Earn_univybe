import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { CourseCover } from "./CourseCover";
import { CourseFallbackCover } from "./CourseFallbackCover";

describe("CourseCover", () => {
  it("renders the thumbnail when there is one", () => {
    const { container } = render(
      <CourseCover title="Calculus I" seed="calc" thumbnailUrl="https://cdn.example/c.jpg" className="h-40" />
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example/c.jpg");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("falls back to the branded cover when there is no thumbnail", () => {
    const { container } = render(<CourseCover title="Calculus I" seed="calc" thumbnailUrl={null} className="h-40" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container).toHaveTextContent("CI");
  });

  it("falls back when the image fails to load, rather than leaving a blank box", () => {
    const { container } = render(
      <CourseCover title="Calculus I" seed="calc" thumbnailUrl="https://cdn.example/broken.jpg" className="h-40" />
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("tries a new thumbnail URL afresh after one failed", () => {
    const { container, rerender } = render(
      <CourseCover title="T" seed="s" thumbnailUrl="https://cdn.example/a.jpg" />
    );
    fireEvent.error(container.querySelector("img")!);
    rerender(<CourseCover title="T" seed="s" thumbnailUrl="https://cdn.example/b.jpg" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example/b.jpg");
  });
});

describe("CourseFallbackCover", () => {
  it("renders identically every time for the same course (no per-render randomness)", () => {
    const html = () =>
      render(<CourseFallbackCover seed="intro-to-programming" title="Intro to Programming" />)
        .container.innerHTML;
    expect(html()).toBe(html());
  });

  it("looks different for different courses", () => {
    const a = render(<CourseFallbackCover seed="a" title="Alpha" />).container.innerHTML;
    const b = render(<CourseFallbackCover seed="zzz" title="Zeta" />).container.innerHTML;
    expect(a).not.toBe(b);
  });
});
