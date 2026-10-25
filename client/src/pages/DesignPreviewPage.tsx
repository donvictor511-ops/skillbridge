import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Select,
  Skeleton,
  Spinner,
  Textarea,
} from "../components/ui";
import { cn } from "../lib/cn";

interface PreviewSectionProps {
  title: string;
  children: ReactNode;
}

function PreviewSection({
  title,
  children,
}: PreviewSectionProps): ReactElement {
  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

interface Swatch {
  name: string;
  className: string;
}

// Full class names are written out so Tailwind can find them.
const swatches: Swatch[] = [
  { name: "navy", className: "bg-navy" },
  { name: "brand", className: "bg-brand" },
  { name: "accent", className: "bg-accent" },
  { name: "page", className: "bg-page" },
  { name: "surface", className: "bg-surface" },
  { name: "ink", className: "bg-ink" },
  { name: "muted", className: "bg-muted" },
  { name: "line", className: "bg-line" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
];

// TEMPORARY page for checking the design system.
// It is removed once the real pages are built.
export default function DesignPreviewPage(): ReactElement {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clickCount, setClickCount] = useState<number>(0);

  function handleDemoClick(): void {
    setClickCount((count) => count + 1);
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <Badge tone="accent">Temporary preview</Badge>
          <h1 className="mt-3 text-2xl font-bold text-navy sm:text-3xl">
            SkillBridge design system
          </h1>
          <p className="mt-2 text-muted">
            Every component and state in one place. Demo button clicks so far:{" "}
            <span className="font-semibold text-ink">{clickCount}</span>
          </p>
        </header>

        <PreviewSection title="Color tokens">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {swatches.map((swatch) => (
              <div key={swatch.name}>
                <div
                  className={cn(
                    "h-12 rounded-control border border-line",
                    swatch.className,
                  )}
                />
                <p className="mt-1 text-sm text-muted">{swatch.name}</p>
              </div>
            ))}
          </div>
        </PreviewSection>

        <PreviewSection title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleDemoClick}>Primary</Button>
            <Button variant="secondary" onClick={handleDemoClick}>
              Secondary
            </Button>
            <Button variant="ghost" onClick={handleDemoClick}>
              Ghost
            </Button>
            <Button variant="danger" onClick={handleDemoClick}>
              Danger
            </Button>
            <Button disabled>Disabled</Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={handleDemoClick}>
              Small
            </Button>
            <Button size="md" onClick={handleDemoClick}>
              Medium
            </Button>
            <Button size="lg" onClick={handleDemoClick}>
              Large
            </Button>
            <Button onClick={handleDemoClick}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              With icon
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button loading={isLoading}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsLoading((value) => !value)}
            >
              Toggle loading
            </Button>
          </div>

          <div className="mt-4">
            <Button fullWidth onClick={handleDemoClick}>
              Full width button
            </Button>
          </div>
        </PreviewSection>

        <PreviewSection title="Form fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" placeholder="Ada Lovelace" />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              hint="We never show your email publicly."
              required
            />
            <Input
              label="Headline"
              defaultValue="Frontend developer"
              error="Headline must be at least 10 characters."
            />
            <Input label="Disabled field" defaultValue="Cannot edit" disabled />
            <Select
              label="Account type"
              hint="You can add the other type later."
              defaultValue="professional"
            >
              <option value="professional">Professional</option>
              <option value="business">Client / Business</option>
            </Select>
            <Select
              label="Location"
              error="Please choose a location."
              defaultValue=""
            >
              <option value="" disabled>
                Select a location
              </option>
              <option value="lagos">Lagos</option>
              <option value="remote">Remote</option>
            </Select>
          </div>
          <div className="mt-4">
            <Textarea
              label="Biography"
              placeholder="Tell people what you do and what you are proud of."
              hint="Maximum 500 characters."
            />
          </div>
        </PreviewSection>

        <PreviewSection title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="brand">React</Badge>
            <Badge tone="accent">Open to work</Badge>
            <Badge tone="success">Accepted</Badge>
            <Badge tone="warning">Pending review</Badge>
            <Badge tone="danger">Rejected</Badge>
          </div>
        </PreviewSection>

        <PreviewSection title="Avatars (the last two test the fallback)">
          <div className="flex flex-wrap items-end gap-4">
            <Avatar name="Ada Lovelace" size="sm" />
            <Avatar name="Grace Hopper" size="md" />
            <Avatar name="Alan Turing" size="lg" />
            <Avatar name="Katherine Johnson" size="xl" />
            <Avatar
              name="Broken Image"
              src="/this-image-does-not-exist.png"
              size="lg"
            />
            <Avatar name="" size="lg" />
          </div>
        </PreviewSection>

        <PreviewSection title="Loading states">
          <div className="flex items-center gap-3 text-brand">
            <Spinner size="lg" label="Loading content" />
            <span className="text-sm text-muted">Spinner</span>
          </div>
          <div className="mt-6 flex items-center gap-4" aria-busy="true">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </PreviewSection>

        <PreviewSection title="Error message">
          <ErrorMessage
            message="We could not load your profile. Check your connection and try again."
            onRetry={handleDemoClick}
          />
        </PreviewSection>

        <PreviewSection title="Empty state">
          <EmptyState
            title="No skills added yet"
            description="Add the skills you want people to find you for."
            action={
              <Button size="sm" onClick={handleDemoClick}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add a skill
              </Button>
            }
          />
        </PreviewSection>
      </div>
    </main>
  );
}
