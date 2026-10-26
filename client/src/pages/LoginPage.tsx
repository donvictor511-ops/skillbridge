import type { ReactElement } from "react";
import { ComingSoon } from "../components/layout/ComingSoon";

// PLACEHOLDER: the real login form and server connection are built in
// Part 3, Step 4. Until then this page honestly says it is not available.
export default function LoginPage(): ReactElement {
  return (
    <ComingSoon
      title="Log in is not available yet"
      description="Accounts are still being built. This page will have a real login form soon."
    />
  );
}
