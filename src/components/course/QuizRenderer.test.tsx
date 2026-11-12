import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Quiz } from "../../types/quiz";
import { QuizRenderer } from "./QuizRenderer";

// Fixture shaped exactly like the real backend response
// (docs/STUDENT_API_PAYLOADS.md §25/26): `correct_answer` holds the literal
// option TEXT, not an index into `options`.
const mcqQuiz: Quiz = {
  id: 4,
  quiz_type: "mcq",
  question: "What is a variable?",
  options: [
    "A container for storing data values",
    "A function",
    "A loop",
    "A class",
  ],
  correct_answer: ["A container for storing data values"],
  order_index: 0,
};

describe("QuizRenderer — MCQ grading against the real API contract", () => {
  it("marks the correct option as correct, not merely any submission", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<QuizRenderer quiz={mcqQuiz} onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("radio", { name: "A container for storing data values" })
    );
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [, meta] = onSubmit.mock.calls[0];
    expect(meta.isCorrect).toBe(true);
  });

  it("marks a wrong option as incorrect", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<QuizRenderer quiz={mcqQuiz} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: "A function" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    // No onSubmit call expected yet on a first wrong attempt (default
    // attempts_allowed is unlimited) — the question offers a retry instead.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/not quite right/i)
    ).toBeInTheDocument();

    // Now answer correctly and confirm it grades as correct.
    await user.click(
      screen.getByRole("radio", { name: "A container for storing data values" })
    );
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [, meta] = onSubmit.mock.calls[0];
    expect(meta.isCorrect).toBe(true);
  });

  it("grades true/false questions by their text, not a stringified index", async () => {
    const trueFalseQuiz: Quiz = {
      id: 5,
      quiz_type: "true_false",
      question: "Water boils at 100°C at sea level.",
      correct_answer: ["True"],
      order_index: 0,
    };
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<QuizRenderer quiz={trueFalseQuiz} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: "True" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [, meta] = onSubmit.mock.calls[0];
    expect(meta.isCorrect).toBe(true);
  });
});
