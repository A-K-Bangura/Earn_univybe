export type QuizType =
  // The real backend sends "mcq" (docs/STUDENT_API_PAYLOADS.md §25/26), not
  // "multiple_choice" — kept both since `mapQuizType`'s `default` already
  // treats any unrecognised value as mcq, so this is for accuracy, not behavior.
  | "mcq"
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "multi_select"
  | "fill_blank"
  | "one_word"
  | "tap_fill";

export interface QuizOption {
  id: string;
  text: string;
  hint?: string | null;
}

export type QuizQuestionType =
  | "mcq" // Multiple Choice - Single answer
  | "multi_select" // Multiple Choice - Multiple answers
  | "short_answer" // Short text answer (keyword matching)
  | "fill_blank" // Fill in the blank
  | "one_word" // Exact word match
  | "tap_fill";

export interface QuizQuestion {
  id: number;
  text: string;
  type: QuizQuestionType;
  options?: QuizOption[];
  correct_answer?: string[] | string[][];
  explanation?: string;
  points?: number;
  attempts_allowed?: number | null;
  order_index?: number;
}

export interface Quiz {
  id: number;
  uuid?: string;
  quiz_type: QuizType;
  title?: string | null;
  question?: string | null;
  description?: string | null;
  image_url?: string | null;
  options?: string[];
  correct_answer?: string[] | string[][];
  explanation?: string | null;
  points?: number;
  xp_reward?: number;
  attempts_allowed?: number | null;
  time_limit_seconds?: number;
  order_index: number;
  lesson_id?: number;
  lesson?: {
    id: number;
    title: string;
    module?: {
      id: number;
      title: string;
      course?: {
        id: number;
        title: string;
      };
    };
  };
  created_at?: string;
  updated_at?: string;
  questions?: QuizQuestion[];
}

export type QuizList = Array<Quiz>;

export interface QuizAnswer {
  question_id: number;
  answer: string | string[]; // Single answer or array of answers
}

export interface QuizSubmission {
  answers: QuizAnswer[];
  time_spent_seconds: number;
  client_event_id: string;
}

export interface QuizResultQuestionBreakdown {
  question_id: number;
  question: string;
  your_answer: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  partial_credit?: number;
  explanation?: string;
}

export interface QuizResult {
  quiz_id: number;
  score: number;
  percentage: number;
  passed: boolean;
  pass_threshold: number;
  correct_answers: number;
  total_questions: number;
  xp_awarded: number;
  time_taken_seconds: number;
  results: QuizResultQuestionBreakdown[];
  progress: {
    total_xp: number;
    streak_days: number;
  };
}

export interface QuizResultLegacyProgress {
  total_xp: number;
  streak_days: number;
}

export interface LegacyQuizResult extends QuizResult {
  progress: QuizResultLegacyProgress;
}

export type LegacyQuizSubmission = QuizSubmission;

export type LegacyQuizResultBreakdown = QuizResultQuestionBreakdown;
