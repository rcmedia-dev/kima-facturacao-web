import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardMetricProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: "blue" | "amber" | "teal" | "indigo";
  detail?: string;
}

const colorConfig = {
  blue: {
    card: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    iconWrap: "bg-blue-50 dark:bg-blue-900/30",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-slate-900 dark:text-white",
    title: "text-slate-500 dark:text-slate-400",
    detail: "text-blue-600 dark:text-blue-400",
  },
  amber: {
    card: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    iconWrap: "bg-amber-50 dark:bg-amber-900/30",
    icon: "text-amber-600 dark:text-amber-400",
    value: "text-slate-900 dark:text-white",
    title: "text-slate-500 dark:text-slate-400",
    detail: "text-amber-600 dark:text-amber-400",
  },
  teal: {
    card: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    iconWrap: "bg-teal-50 dark:bg-teal-900/30",
    icon: "text-teal-600 dark:text-teal-400",
    value: "text-slate-900 dark:text-white",
    title: "text-slate-500 dark:text-slate-400",
    detail: "text-teal-600 dark:text-teal-400",
  },
  indigo: {
    card: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    iconWrap: "bg-indigo-50 dark:bg-indigo-900/30",
    icon: "text-indigo-600 dark:text-indigo-400",
    value: "text-slate-900 dark:text-white",
    title: "text-slate-500 dark:text-slate-400",
    detail: "text-indigo-600 dark:text-indigo-400",
  },
};

export function DashboardMetric({
  title,
  value,
  icon: Icon,
  color = "blue",
  detail,
}: DashboardMetricProps) {
  const c = colorConfig[color];

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        c.card
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl", c.iconWrap)}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>

      <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", c.title)}>
        {title}
      </p>
      <p className={cn("text-2xl font-bold leading-tight", c.value)}>
        {value}
      </p>
      {detail && (
        <p className={cn("text-xs font-medium mt-1.5", c.detail)}>
          {detail}
        </p>
      )}
    </div>
  );
}
