import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Circle,
  Lock,
  X,
} from "lucide-react";
import type { CourseOutline } from "../../types/lesson";

interface OutlineSidebarProps {
  outline: CourseOutline;
  currentLessonId: number | null;
  currentModuleId: number | null;
  onNavigate: (moduleId: number, lessonId: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const OutlineSidebar = ({
  outline,
  currentLessonId,
  currentModuleId,
  onNavigate,
  isOpen,
  onToggle,
}: OutlineSidebarProps) => {
  const [expandedModules, setExpandedModules] = useState<number[]>([
    currentModuleId || outline.modules[0]?.id || 0,
  ]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          fixed md:sticky top-0 left-0 h-dvh w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg md:shadow-none z-30 transition-transform duration-300 overflow-y-auto
        `}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Course Outline
            </h3>
            <button
              onClick={onToggle}
              aria-label="Close course outline"
              className="md:hidden p-1 -m-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {outline.modules.map((module) => {
            const isExpanded = expandedModules.includes(module.id);
            const isModuleCompleted = module.is_completed ?? false;

            return (
              <div key={module.id} className="mb-2">
                <button
                  onClick={() => toggleModule(module.id)}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg transition-colors
                    ${
                      isModuleCompleted
                        ? "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  <span
                    className={`font-medium text-sm ${
                      isModuleCompleted
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    Module {module.order_index}: {module.title}
                  </span>
                  {isExpanded ? (
                    <ChevronDown
                      className={`w-4 h-4 ${
                        isModuleCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                  ) : (
                    <ChevronRight
                      className={`w-4 h-4 ${
                        isModuleCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500"
                      }`}
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {module.lessons.map((lesson) => {
                      const isCurrent = lesson.id === currentLessonId;
                      const isCompleted = lesson.is_completed;
                      const isLocked = lesson.is_locked ?? false;

                      return (
                        <div key={lesson.id}>
                          <button
                            onClick={() => {
                              if (!isLocked) {
                                onNavigate(module.id, lesson.id);
                              }
                            }}
                            disabled={isLocked}
                            className={`
                              w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors
                              ${
                                isLocked
                                  ? "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500"
                                  : isCurrent
                                  ? "bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300"
                                  : isCompleted
                                  ? "hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-300"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                              }
                            `}
                            title={
                              isLocked
                                ? "Complete previous lessons to unlock"
                                : undefined
                            }
                          >
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                            ) : isCompleted ? (
                              <span className="w-4 h-4 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center shrink-0">
                                <Check className="w-6 h-6 yellow" strokeWidth={3} />
                              </span>
                            ) : (
                              <Circle className="w-4 h-4 shrink-0" />
                            )}
                            <span className="text-sm truncate">
                              {lesson.title}
                            </span>
                          </button>
                          {/* Show quizzes if available - COMMENTED OUT FOR NOW */}
                          {/* {lesson.quizzes && lesson.quizzes.length > 0 && (
                            <div className="ml-6 mt-1 space-y-1">
                              {lesson.quizzes.map((quiz) => {
                                const isQuizCompleted = quiz.is_completed;
                                return (
                                  <div
                                    key={quiz.id}
                                    className={`
                                      flex items-center gap-2 px-2 py-1 rounded text-xs
                                      ${
                                        isQuizCompleted
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-gray-500 dark:text-gray-400"
                                      }
                                    `}
                                  >
                                    {isQuizCompleted ? (
                                      <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0 fill-current" />
                                    ) : (
                                      <Circle className="w-3 h-3 flex-shrink-0" />
                                    )}
                                    <span className="truncate">
                                      Quiz: {quiz.title || `Quiz ${quiz.order_index}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )} */}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
