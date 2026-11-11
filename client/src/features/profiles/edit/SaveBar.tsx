import type { ReactElement } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Button } from "../../../components/ui";

interface SaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  justSaved: boolean;
  onCancel: () => void;
}

// The bottom row of a form: a status message, Cancel, and Save.
// The status uses an icon AND words, never color alone.
export function SaveBar({
  isDirty,
  isSaving,
  justSaved,
  onCancel,
}: SaveBarProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p role="status" className="min-h-5 text-sm">
        {isDirty ? (
          <span className="flex items-center gap-1.5 text-warning-strong">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Unsaved changes
          </span>
        ) : justSaved ? (
          <span className="flex items-center gap-1.5 text-success-strong">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            All changes saved
          </span>
        ) : null}
      </p>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={!isDirty || isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSaving} disabled={!isDirty}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
