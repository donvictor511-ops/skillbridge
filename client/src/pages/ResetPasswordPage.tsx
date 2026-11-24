import type { ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../app/paths";
import { AuthCard } from "../features/auth/AuthCard";
import { ResetPasswordForm } from "../features/auth/ResetPasswordForm";

export default function ResetPasswordPage(): ReactElement {
  return (
    <AuthCard
      title="Choose a new password"
      description="Create a new password for your SkillBridge account. Reset links expire after 30 minutes."
      footer={<>Need a new link? <Link to={paths.forgotPassword} className="font-semibold text-brand underline-offset-4 hover:underline">Request another</Link></>}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
