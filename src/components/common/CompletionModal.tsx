import { useEffect, useState } from "react";
import { X, Trophy, Flame, Award } from "lucide-react";
import type { Badge } from "../../types/dashboard";
import { formatXP } from "../../utils/format";
import successIcon from "../../assets/animations/SuccessCheck.webm";

interface CompletionModalProps {
  xpGained: number;
  newTotalXP: number;
  streakDays?: number;
  badge?: Badge | null;
  onContinue: () => void;
  onClose?: () => void;
}

export const CompletionModal = ({
  xpGained,
  newTotalXP,
  streakDays = 0,
  badge,
  onContinue,
  onClose,
}: CompletionModalProps) => {
  const [animatedXP, setAnimatedXP] = useState(0);

  useEffect(() => {
    // Animate XP counter
    const duration = 1500;
    const steps = 30;
    const increment = xpGained / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= xpGained) {
        setAnimatedXP(xpGained);
        clearInterval(timer);
      } else {
        setAnimatedXP(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [xpGained]);

  // Motivational messages based on XP gained
  const getMotivationalMessage = () => {
    if (badge) {
      return "Amazing! You just earned a badge! Keep going! 🏆";
    }
    if (streakDays >= 7) {
      return "You're on fire! 🔥 Keep up your amazing streak!";
    }
    if (xpGained >= 30) {
      return "Outstanding work! You're learning so much! 🌟";
    }
    return "Great job! Every step brings you closer to your goals! 💪";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
            <video src={successIcon} autoPlay loop muted className="w-24 h-24 object-contain" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Lesson Complete! 🎉
          </h2>

          {/* XP Display */}
          <div className="my-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-5xl font-bold bg-gradient-to-r from-azure-500 to-blue-violet-500 bg-clip-text text-transparent">
                  +{animatedXP}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  XP Earned
                </div>
              </div>
            </div>

            <div className="text-lg text-gray-600 dark:text-gray-400">
              Total: {formatXP(newTotalXP)}
            </div>
          </div>

          {/* Streak Display */}
          {streakDays > 0 && (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <Flame className="w-6 h-6 text-rose-500" />
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {streakDays} Day Streak! 🔥
              </span>
            </div>
          )}

          {/* Badge Display */}
          {badge && (
            <div className="mb-6 p-6 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 rounded-lg border-2 border-amber-200 dark:border-amber-800">
              <Award className="w-16 h-16 text-amber-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                New Badge Earned!
              </h3>
              <p className="text-amber-600 dark:text-amber-400 font-semibold">
                {badge.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {badge.description}
              </p>
            </div>
          )}

          {/* Motivational Message */}
          <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">
            {getMotivationalMessage()}
          </p>

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-azure-500 to-blue-violet-500 hover:from-azure-600 hover:to-blue-violet-600 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  );
};
