import type { ReactElement } from "react";
import { Link } from "react-router";
import { Construction } from "lucide-react";
import { paths } from "../../app/paths";
import { Badge, getButtonClasses } from "../ui";
import { PageMessage } from "./PageMessage";

interface ComingSoonProps {
  title: string;
  description: string;
}

// Used ONLY for features that are planned but not built yet.
// It never shows a fake form or a button that pretends to work.
export function ComingSoon({
  title,
  description,
}: ComingSoonProps): ReactElement {
  return (
    <PageMessage
      icon={Construction}
      badge={<Badge tone="warning">Not available yet</Badge>}
      title={title}
      description={description}
      actions={
        <Link
          to={paths.home}
          className={getButtonClasses({
            variant: "primary",
            size: "md",
            fullWidth: false,
          })}
        >
          Back to home
        </Link>
      }
    />
  );
}
