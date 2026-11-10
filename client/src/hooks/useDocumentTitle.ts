import { useEffect } from "react";

// Sets the browser tab title while a page is shown, then restores the old one.
// A clear page title helps everyone, especially screen reader users.
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
