import type { ReactElement } from "react";
import { Link } from "react-router";
import { Lock } from "lucide-react";
import { paths } from "../app/paths";
import { PageMessage } from "../components/layout/PageMessage";
import { getButtonClasses } from "../components/ui";

// Shown when someone is not allowed to view a page.
// Remember: the real permission check always happens on the server.
// This page only explains the situation kindly.
export default function AccessDeniedPage(): ReactElement {
  return (
    <PageMessage
      icon={Lock}
      code="Error 403"
      title="You do not have access to this page"
      description="Your account does not have permission to view this page. If you think this is a mistake, try logging in with a different account."
      actions={
        <>
          <Link
            to={paths.home}
            className={getButtonClasses({
              variant: "primary",
              size: "md",
              fullWidth: false,
            })}
          >
            Go to home
          </Link>
          <Link
            to={paths.login}
            className={getButtonClasses({
              variant: "secondary",
              size: "md",
              fullWidth: false,
            })}
          >
            Log in
          </Link>
        </>
      }
    />
  );
}
