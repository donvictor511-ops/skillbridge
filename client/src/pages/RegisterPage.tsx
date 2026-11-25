import type { ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../app/paths";
import { AuthCard } from "../features/auth/AuthCard";
import { RegisterForm } from "../features/auth/RegisterForm";
import { SocialAuthButtons } from "../features/auth/SocialAuthButtons";

export default function RegisterPage(): ReactElement {
  return (
    <AuthCard
      title="Create your account"
      description="Join SkillBridge and start building a profile backed by real work."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={paths.login}
            className="rounded-control font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
          >
            Log in
          </Link>
        </>
      }
    >
      <>
        <SocialAuthButtons />
        <RegisterForm />
      </>
    </AuthCard>
  );
}
