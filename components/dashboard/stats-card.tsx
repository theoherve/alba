"use client";

import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  className?: string;
}

export const StatsCard = ({
  title,
  value,
  description,
  icon,
  iconClassName,
  className,
}: StatsCardProps) => {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-6",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
            iconClassName || "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
      )}
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{title}</div>
      {description && (
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  );
};
