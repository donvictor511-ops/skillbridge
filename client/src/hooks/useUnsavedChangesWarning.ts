import { useEffect } from "react";

// While there are unsaved changes, the browser asks "Leave this page?" before
// the tab is closed or reloaded.
// Limit: this does not catch clicks on links INSIDE the app. We accept that for now.
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}
