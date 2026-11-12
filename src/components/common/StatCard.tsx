import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: StatCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <div className={`${color} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </h3>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
