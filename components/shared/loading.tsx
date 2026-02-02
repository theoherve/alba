import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const Loading = ({ className, size = "md", text }: LoadingProps) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizeClasses[size]
        )}
        role="status"
        aria-label="Chargement"
      />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

export const PageLoading = () => {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <Loading size="lg" text="Chargement..." />
    </div>
  );
};
