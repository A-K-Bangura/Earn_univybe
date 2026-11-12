import { useEffect, useMemo, useState } from "react";
import type {
  Quiz,
  QuizAnswer,
  QuizSubmission,
  QuizQuestion,
  QuizOption,
  QuizQuestionType,
} from "../../types/quiz";
import { evaluateQuizAnswer } from "../../utils/quizValidation";

interface QuizRendererProps {
  quiz: Quiz;
  onSubmit: (
    result: QuizSubmission,
    meta: QuizAttemptMeta
  ) => void | Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export type QuizAttemptMeta = {
  questionId: number;
  isCorrect: boolean;
  attemptsUsed: number;
  maxAttempts?: number;
  maxAttemptsReached: boolean;
};

const mapQuizType = (quizType?: Quiz["quiz_type"]): QuizQuestionType => {
  switch (quizType) {
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
    default:
      return "mcq";
  }
};

// The backend's `correct_answer` is an array of the literal option TEXT
// (docs/STUDENT_API_PAYLOADS.md §25/26 — e.g.
// `correct_answer: ["A container for storing data values"]`, matching an
// entry in `options` verbatim), not an index. Option ids must therefore be
// the option's own text so a submitted answer can ever equal `correct_answer`
// — using stringified array indices here previously made every MCQ/true-false
// submission compare an index ("0") against text and always fail.
const normaliseOptions = (
  quiz: Quiz,
  question: QuizQuestion
): QuizOption[] | undefined => {
  if (question.options && question.options.length > 0) {
    return question.options.map((opt) => ({
      id: opt.text,
      text: opt.text,
      hint: opt.hint,
    }));
  }

  if (quiz.options && quiz.options.length > 0) {
    return quiz.options.map((option) => ({
      id: option,
      text: option,
    }));
  }

  if (quiz.quiz_type === "true_false") {
    return [
      { id: "True", text: "True" },
      { id: "False", text: "False" },
    ];
  }

  return undefined;
};

const normaliseQuestions = (quiz: Quiz): QuizQuestion[] => {
  if (quiz.questions && quiz.questions.length > 0) {
    return quiz.questions;
  }

  const type = mapQuizType(quiz.quiz_type);
  const baseQuestion: QuizQuestion = {
    id: quiz.id,
    text: quiz.question || "Untitled question",
    type,
    options: undefined,
    correct_answer: quiz.correct_answer,
    explanation: quiz.explanation || undefined,
    points: quiz.points || 0,
  };

  const options = normaliseOptions(quiz, baseQuestion);
  if (options) {
    baseQuestion.options = options;
  }

  return [baseQuestion];
};

export const QuizRenderer = ({
  quiz,
  onSubmit,
  isSubmitting = false,
  className,
}: QuizRendererProps) => {
  const questions = useMemo(() => normaliseQuestions(quiz), [quiz]);
  const totalQuestions = questions.length;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [startTime, setStartTime] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<
    Record<
      number,
      {
        status: "idle" | "incorrect" | "correct" | "max_attempts";
        message?: string;
        revealAnswer?: boolean;
      }
    >
  >({});

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setAttempts({});
    setFeedback({});
    setStartTime(Date.now());
  }, [quiz.id]);

  const currentQuestion = questions[currentQuestionIndex];
  // const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  // Determine effective type: if mcq but multiple correct answers are allowed, treat as multi_select
  const currentCorrect =
    (currentQuestion.correct_answer ?? quiz.correct_answer) || [];
  const correctCount = Array.isArray(currentCorrect)
    ? Array.isArray(currentCorrect[0])
      ? (currentCorrect as string[][]).flat().length
      : (currentCorrect as string[]).length
    : 0;
  const effectiveType: QuizQuestionType =
    currentQuestion.type === "mcq" && correctCount > 1
      ? "multi_select"
      : currentQuestion.type;

  const handleAnswer = (questionId: number, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((index) => index + 1);
    } else {
      handleSubmit();
    }
  };

  // const handlePrevious = () => {
  //   if (currentQuestionIndex > 0) {
  //     setCurrentQuestionIndex((index) => index - 1);
  //   }
  // };

  const handleSubmit = () => {
    const rawAnswer = answers[currentQuestion.id];
    const evaluation = evaluateQuizAnswer(quiz, currentQuestion, rawAnswer);

    if (!evaluation.canValidate) {
      const answersArray: QuizAnswer[] = Object.entries(answers).map(
        ([questionId, answer]) => ({
          question_id: Number(questionId),
          answer,
        })
      );

      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      onSubmit(
        {
          answers: answersArray,
          time_spent_seconds: timeSpent,
          client_event_id: `quiz-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        },
        {
          questionId: currentQuestion.id,
          isCorrect: true,
          attemptsUsed: 1,
          maxAttempts: undefined,
          maxAttemptsReached: true,
        }
      );
      return;
    }

    const attemptsUsed = (attempts[currentQuestion.id] || 0) + 1;
    const maxAttempts =
      currentQuestion.attempts_allowed ?? quiz.attempts_allowed ?? Infinity;
    const maxAttemptsReached = attemptsUsed >= maxAttempts;
    const isCorrect = evaluation.isCorrect;

    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.id]: attemptsUsed,
    }));

    const shouldReveal = isCorrect || maxAttemptsReached;

    if (!shouldReveal) {
      setFeedback((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          status: "incorrect",
          message:
            maxAttempts === Infinity
              ? "Not quite right. Try again!"
              : `Not quite right. You have ${
                  maxAttempts - attemptsUsed
                } attempts remaining.`,
          revealAnswer: false,
        },
      }));
      return;
    }

    const answersArray: QuizAnswer[] = Object.entries(answers).map(
      ([questionId, answer]) => ({
        question_id: Number(questionId),
        answer,
      })
    );

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setFeedback((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        status: isCorrect ? "correct" : "max_attempts",
        message: isCorrect
          ? "Great job! That's correct."
          : "You've reached the maximum number of attempts. Here's the solution.",
        revealAnswer: true,
      },
    }));

    onSubmit(
      {
        answers: answersArray,
        time_spent_seconds: timeSpent,
        client_event_id: `quiz-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      },
      {
        questionId: currentQuestion.id,
        isCorrect,
        attemptsUsed,
        maxAttempts: maxAttempts === Infinity ? undefined : maxAttempts,
        maxAttemptsReached,
      }
    );
  };

  const questionOptions = normaliseOptions(quiz, currentQuestion);
  const requiresAnswer =
    effectiveType === "mcq" ||
    effectiveType === "multi_select" ||
    effectiveType === "short_answer" ||
    effectiveType === "fill_blank" ||
    effectiveType === "one_word";
  const currentAnswer = answers[currentQuestion.id];
  const isAnswerEmpty =
    !currentAnswer ||
    (Array.isArray(currentAnswer) && currentAnswer.length === 0);
  const questionFeedback = feedback[currentQuestion.id];

  return (
    <div className={className ?? ""}>
      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {currentQuestion.text}
        </h3>

        {/* Optional image under the question */}
        {quiz.image_url && (
          <div className="mb-4">
            <img
              src={quiz.image_url}
              alt="Quiz illustration"
              className="rounded-lg max-h-80 object-contain w-full"
            />
          </div>
        )}

        {/* Render based on question type */}
        {(effectiveType === "mcq" || effectiveType === "multi_select") &&
          questionOptions && (
            <div className="space-y-3">
              {effectiveType === "multi_select" && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Select all that apply
                </p>
              )}
              {questionOptions.map((option) => {
                const isSelected = Array.isArray(currentAnswer)
                  ? (currentAnswer as string[]).includes(option.id)
                  : currentAnswer === option.id;

                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "border-azure-500 bg-azure-50 dark:border-azure-400/60 dark:bg-azure-900/30"
                        : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <input
                      type={
                        effectiveType === "multi_select" ? "checkbox" : "radio"
                      }
                      name={`question-${currentQuestion.id}`}
                      value={option.id}
                      checked={isSelected}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        if (effectiveType === "multi_select") {
                          const currentAnswers = Array.isArray(currentAnswer)
                            ? (currentAnswer as string[])
                            : [];
                          if (e.target.checked) {
                            handleAnswer(currentQuestion.id, [
                              ...currentAnswers,
                              option.id,
                            ]);
                          } else {
                            handleAnswer(
                              currentQuestion.id,
                              currentAnswers.filter(
                                (id: string) => id !== option.id
                              )
                            );
                          }
                        } else {
                          handleAnswer(currentQuestion.id, option.id);
                        }
                      }}
                      className="w-5 h-5 text-azure-500 focus:ring-azure-500"
                    />
                    <span className="text-gray-900 dark:text-white">
                      {option.text}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

        {(effectiveType === "short_answer" ||
          effectiveType === "one_word" ||
          effectiveType === "fill_blank") && (
          <input
            type="text"
            value={(currentAnswer as string) || ""}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            placeholder={
              effectiveType === "fill_blank"
                ? "Type answers for each blank, separated by commas (e.g., word1, word2)"
                : "Type your answer..."
            }
            disabled={isSubmitting || questionFeedback?.status === "correct"}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
          />
        )}

        {questionFeedback && (
          <div
            className={`mt-6 rounded-lg p-4 text-sm ${
              questionFeedback.status === "correct"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                : questionFeedback.status === "incorrect"
                ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}
          >
            <p>{questionFeedback.message}</p>
            {questionFeedback.revealAnswer &&
              (currentQuestion.explanation || quiz.explanation) && (
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                  {currentQuestion.explanation || quiz.explanation}
                </p>
              )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end">
        {/* <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isSubmitting}
          className="flex items-center gap-2 px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          Previous
        </button> */}

        <button
          onClick={handleNext}
          disabled={isSubmitting || (requiresAnswer && isAnswerEmpty)}
          className="flex items-center gap-2 px-6 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isSubmitting
            ? "Submitting..."
            : currentQuestionIndex === totalQuestions - 1
            ? "Submit Quiz"
            : "Next"}
        </button>
      </div>
    </div>
  );
};
