import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { formatXP } from "../../utils/format";

interface XPCounterProps {
  xp: number;
  animate?: boolean;
  className?: string;
}

export const XPCounter = ({
  xp,
  animate = false,
  className = "",
}: XPCounterProps) => {
  const [displayXP, setDisplayXP] = useState(animate ? 0 : xp);

  useEffect(() => {
    if (animate) {
      const duration = 1500;
      const steps = 30;
      const increment = xp / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= xp) {
          setDisplayXP(xp);
          clearInterval(timer);
        } else {
          setDisplayXP(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayXP(xp);
    }
  }, [xp, animate]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Trophy className="w-5 h-5 text-amber-500" />
      <span className="font-semibold text-gray-900 dark:text-white">
        {formatXP(displayXP)}
      </span>
    </div>
  );
};
