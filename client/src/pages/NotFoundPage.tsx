import type { ReactElement } from "react";
import { Link } from "react-router";
import { SearchX } from "lucide-react";
import { paths } from "../app/paths";
import { PageMessage } from "../components/layout/PageMessage";
import { getButtonClasses } from "../components/ui";

export default function NotFoundPage(): ReactElement {
  return (
    <PageMessage
      icon={SearchX}
      code="Error 404"
      title="Page not found"
      description="The page you are looking for does not exist, or it may have moved."
      actions={
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
      }
    />
  );
}
