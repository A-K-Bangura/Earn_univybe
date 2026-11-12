import type { Quiz, QuizQuestion, QuizQuestionType } from "../types/quiz";

export interface QuizEvaluation {
  canValidate: boolean;
  isCorrect: boolean;
}

const normalizeString = (value: string): string => value.trim().toLowerCase();

const getQuestionType = (
  quiz: Quiz,
  question: QuizQuestion
): QuizQuestionType => {
  if (question.type) {
    return question.type;
  }

  switch (quiz.quiz_type) {
    case "multiple_choice":
      return "mcq";
    case "multi_select":
      return "multi_select";
    case "fill_blank":
      return "fill_blank";
    case "one_word":
      return "one_word";
    case "short_answer":
    case "essay":
      return "short_answer";
    case "true_false":
      return "mcq";
    case "tap_fill":
      return "tap_fill";
    default:
      return "mcq";
  }
};

const getCorrectAnswer = (
  quiz: Quiz,
  question: QuizQuestion
): string[] | string[][] | undefined =>
  question.correct_answer ?? quiz.correct_answer;

const toArray = (value: string | string[] | undefined | null): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const isMcqCorrect = (submitted: string[], correct: string[]): boolean => {
  if (submitted.length !== correct.length) {
    return false;
  }
  const submittedSet = new Set(submitted.map(normalizeString));
  return correct.every((id) => submittedSet.has(normalizeString(id)));
};

const isMultiSelectCorrect = (
  submitted: string[],
  correct: string[]
): boolean => {
  if (submitted.length !== correct.length) {
    return false;
  }
  const submittedSet = new Set(submitted.map(normalizeString));
  const correctSet = new Set(correct.map(normalizeString));
  if (submittedSet.size !== correctSet.size) {
    return false;
  }
  for (const item of submittedSet) {
    if (!correctSet.has(item)) {
      return false;
    }
  }
  return true;
};

const isShortAnswerCorrect = (
  submitted: string,
  correctAnswers: string[]
): boolean => {
  if (!submitted.trim()) {
    return false;
  }
  const normalized = normalizeString(submitted);
  return correctAnswers.some(
    (answer) => normalizeString(answer) === normalized
  );
};

const isFillBlankCorrect = (
  submitted: string[],
  correctAnswers: string[] | string[][]
): boolean => {
  // New behavior: When correctAnswers is a flat array (string[]),
  // require an ordered, perfect match (case-insensitive, trimmed).
  if (!Array.isArray(correctAnswers[0])) {
    const flatCorrect = correctAnswers as string[];
    if (submitted.length !== flatCorrect.length) {
      return false;
    }
    for (let i = 0; i < flatCorrect.length; i++) {
      if (normalizeString(submitted[i]) !== normalizeString(flatCorrect[i])) {
        return false;
      }
    }
    return true;
  }

  // Legacy behavior: matrix of acceptable answers per blank
  const matrix = correctAnswers as string[][];
  if (submitted.length !== matrix.length) {
    return false;
  }
  return submitted.every((answer, index) => {
    const normalized = normalizeString(answer);
    const acceptable = matrix[index]?.map(normalizeString) ?? [];
    return acceptable.includes(normalized);
  });
};

const isTapFillCorrect = (submitted: string[], correct: string[]): boolean => {
  if (submitted.length !== correct.length) {
    return false;
  }
  return submitted.every((token, index) => token === correct[index]);
};

export const evaluateQuizAnswer = (
  quiz: Quiz,
  question: QuizQuestion,
  rawAnswer: string | string[] | undefined
): QuizEvaluation => {
  const type = getQuestionType(quiz, question);
  const correct = getCorrectAnswer(quiz, question);

  if (!correct || correct.length === 0) {
    return {
      canValidate: false,
      isCorrect: false,
    };
  }

  switch (type) {
    case "mcq": {
      const submitted = toArray(rawAnswer);
      const correctArray = toArray(correct as string[]);
      return {
        canValidate: true,
        isCorrect: isMcqCorrect(submitted, correctArray),
      };
    }
    case "multi_select": {
      const submitted = toArray(rawAnswer);
      const correctArray = toArray(correct as string[]);
      return {
        canValidate: true,
        isCorrect: isMultiSelectCorrect(submitted, correctArray),
      };
    }
    case "short_answer":
    case "one_word": {
      if (typeof rawAnswer !== "string") {
        return {
          canValidate: true,
          isCorrect: false,
        };
      }
      const correctArray = toArray(correct as string[]);
      return {
        canValidate: true,
        isCorrect: isShortAnswerCorrect(rawAnswer, correctArray),
      };
    }
    case "fill_blank": {
      // Accept either an array or a comma-separated string.
      let submitted: string[];
      if (Array.isArray(rawAnswer)) {
        submitted = rawAnswer as string[];
      } else if (typeof rawAnswer === "string") {
        submitted = rawAnswer
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else {
        submitted = [];
      }

      return {
        canValidate: true,
        isCorrect: isFillBlankCorrect(
          submitted,
          correct as string[] | string[][]
        ),
      };
    }
    case "tap_fill": {
      const submitted = toArray(rawAnswer);
      const correctArray = toArray(correct as string[]);
      return {
        canValidate: true,
        isCorrect: isTapFillCorrect(submitted, correctArray),
      };
    }
    default:
      return {
        canValidate: false,
        isCorrect: false,
      };
  }
};
