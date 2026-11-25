import type { ReactElement } from "react";
import { useSearchParams } from "react-router";
import { ErrorMessage } from "../../components/ui";
import { apiBaseURL } from "../../services/apiClient";

export function SocialAuthButtons(): ReactElement {
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("oauthError");
  const startUrl = (provider: "google" | "linkedin") =>
    `${apiBaseURL.replace(/\/$/, "")}/auth/oauth/${provider}`;

  return (
    <div className="mb-6 space-y-4">
      {oauthError ? (
        <ErrorMessage
          title="Could not sign in"
          message="That sign-in did not finish. Try again, or use your email and password."
        />
      ) : null}
      <div className="space-y-3">
        <a
          href={startUrl("google")}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.37 38.12 47 31.92 47 24.55Z" />
            <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.2a23.95 23.95 0 0 0 0 21.58l7.98-6.2Z" transform="translate(0 4)" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.87 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
          </svg>
          Continue with Google
        </a>
        <a
          href={startUrl("linkedin")}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-[#0A66C2]">
            <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM8.05 18.35H5.1V9.4h2.95v8.95ZM6.57 8.18a1.71 1.71 0 1 1 .02-3.42 1.71 1.71 0 0 1-.02 3.42Zm12.28 10.17H15.9V14c0-1.04-.02-2.38-1.45-2.38-1.45 0-1.67 1.13-1.67 2.3v4.43H9.84V9.4h2.82v1.22h.04c.39-.7 1.35-1.44 2.78-1.44 2.97 0 3.52 1.95 3.52 4.49v4.68h-.15Z" />
          </svg>
          Continue with LinkedIn
        </a>
      </div>
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />
        <span>Or continue with email</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
