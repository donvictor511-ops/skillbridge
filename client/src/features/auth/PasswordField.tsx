import { useState } from "react";
import type { ReactElement } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "../../components/ui";
import type { InputProps } from "../../components/ui";

type PasswordFieldProps = Omit<InputProps, "type" | "endAdornment">;

// A password input with a "show password" toggle. Showing the password helps
// people avoid typos, especially on phones.
export function PasswordField(props: PasswordFieldProps): ReactElement {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  return (
    <Input
      {...props}
      type={isVisible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label="Show password"
          aria-pressed={isVisible}
          className="inline-flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:text-navy"
        >
          {isVisible ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
