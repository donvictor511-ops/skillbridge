import type { ReactElement } from "react";
import { Button } from "../../../components/ui";

interface ConfirmDeleteProps {
  question: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// An inline "are you sure?" that replaces a pop-up. The SAFE choice ("Keep it")
// gets the keyboard focus first, so pressing Enter by accident does not delete.
export function ConfirmDelete({
  question,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps): ReactElement {
  return (
    <div
      role="group"
      aria-label="Confirm delete"
      className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4"
    >
      <p className="text-sm font-semibold text-danger-strong">{question}</p>
      <p className="mt-1 text-sm text-ink">This cannot be undone.</p>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="danger"
          size="sm"
          loading={isDeleting}
          onClick={onConfirm}
        >
          Yes, delete
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isDeleting}
          autoFocus
        >
          Keep it
        </Button>
      </div>
    </div>
  );
}
