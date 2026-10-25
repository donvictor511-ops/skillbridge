import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "../../lib/cn";
import { getButtonClasses } from "./buttonStyles";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";
import { Spinner } from "./Spinner";

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  type = "button",
  disabled = false,
  className,
  children,
  ...buttonProps
}: ButtonProps): ReactElement {
  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      className={cn(getButtonClasses({ variant, size, fullWidth }), className)}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
}
