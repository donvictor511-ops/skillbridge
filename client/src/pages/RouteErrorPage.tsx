import type { ReactElement } from "react";
import { Link } from "react-router";
import { TriangleAlert } from "lucide-react";
import { paths } from "../app/paths";
import { PageMessage } from "../components/layout/PageMessage";
import { Button, getButtonClasses } from "../components/ui";

// The safety net: shown if a page crashes unexpectedly.
// We never show error details to users. The technical error is written to
// the browser console, which only the developer reads.
export default function RouteErrorPage(): ReactElement {
  function handleReload(): void {
    window.location.reload();
  }

  return (
    <PageMessage
      icon={TriangleAlert}
      title="Something went wrong"
      description="We hit an unexpected problem while showing this page. Please try again."
      actions={
        <>
          <Button onClick={handleReload}>Reload page</Button>
          <Link
            to={paths.home}
            className={getButtonClasses({
              variant: "secondary",
              size: "md",
              fullWidth: false,
            })}
          >
            Go to home
          </Link>
        </>
      }
    />
  );
}
