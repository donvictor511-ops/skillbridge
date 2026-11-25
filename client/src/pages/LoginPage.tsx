import type { ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../app/paths";
import { AuthCard } from "../features/auth/AuthCard";
import { LoginForm } from "../features/auth/LoginForm";
import { SocialAuthButtons } from "../features/auth/SocialAuthButtons";

export default function LoginPage(): ReactElement {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your SkillBridge account."
      footer={
        <>
          New to SkillBridge?{" "}
          <Link
            to={paths.register}
            className="rounded-control font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
          >
            Create an account
          </Link>
        </>
      }
    >
      <>
        <SocialAuthButtons />
        <LoginForm />
      </>
    </AuthCard>
  );
}
