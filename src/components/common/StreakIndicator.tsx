import { Flame } from "lucide-react";

interface StreakIndicatorProps {
  days: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const StreakIndicator = ({
  days,
  size = "md",
  showText = true,
}: StreakIndicatorProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex items-center gap-2">
      <Flame className={`${sizeClasses[size]} text-rose-500`} />
      {showText && (
        <span
          className={`font-semibold text-rose-600 dark:text-rose-400 ${textSizeClasses[size]}`}
        >
          {days} Day{days !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};
