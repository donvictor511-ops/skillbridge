import { useState } from "react";
import type { ReactElement } from "react";
import { cn } from "../../lib/cn";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.charAt(0) ?? "";
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";

  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: AvatarProps): ReactElement {
  // Remember which image address failed, so a new address gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const imageSrc =
    typeof src === "string" && src !== "" && src !== failedSrc ? src : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-semibold text-white",
        sizeClasses[size],
        className,
      )}
    >
      {imageSrc !== null ? (
        <img
          src={imageSrc}
          alt={`Profile photo of ${name}`}
          loading="lazy"
          onError={() => setFailedSrc(imageSrc)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span role="img" aria-label={name}>
          <span aria-hidden="true">{getInitials(name)}</span>
        </span>
      )}
    </span>
  );
}
