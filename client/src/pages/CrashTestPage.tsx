import type { ReactElement } from "react";

// TEMPORARY: crashes on purpose to test the error page. Delete after testing.
export default function CrashTestPage(): ReactElement {
  throw new Error("Test error: this page crashes on purpose");
}
