import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, showText = true, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-9 w-9 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link href="/" className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold",
          sizeClasses[size]
        )}
        aria-hidden="true"
      >
        A
      </div>
      {showText && (
        <span className={cn("font-semibold text-foreground", textSizeClasses[size])}>
          Alba
        </span>
      )}
    </Link>
  );
};
