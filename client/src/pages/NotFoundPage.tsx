import type { ReactElement } from "react";
import { Link } from "react-router";
import { Compass } from "lucide-react";
import { Container } from "../components/layout/Container";
import { EmptyState, getButtonClasses } from "../components/ui";

export default function NotFoundPage(): ReactElement {
  return (
    <Container className="py-16">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="This page does not exist yet, or the link is wrong."
        action={
          <Link
            to="/"
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
    </Container>
  );
}
