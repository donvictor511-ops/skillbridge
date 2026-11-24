import type { ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../app/paths";
import { AuthCard } from "../features/auth/AuthCard";
import { ForgotPasswordForm } from "../features/auth/ForgotPasswordForm";

export default function ForgotPasswordPage(): ReactElement {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email address on your account and we’ll send you a secure reset link."
      footer={<>Back to <Link to={paths.login} className="font-semibold text-brand underline-offset-4 hover:underline">log in</Link></>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
