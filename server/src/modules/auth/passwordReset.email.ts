import { env } from "../../config/env";

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(
    (env.brevoApiKey && env.brevoFromEmail) ||
      (env.resendApiKey && env.resendFromEmail),
  );
}

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
): Promise<void> {
  if (env.brevoApiKey && env.brevoFromEmail) {
    await sendWithBrevo(recipient, resetUrl);
    return;
  }

  if (!env.resendApiKey || !env.resendFromEmail) {
    throw new Error("Password reset email is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: [recipient],
      subject: "Reset your SkillBridge password",
      text: `We received a request to reset your SkillBridge password. Use this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request a reset, you can ignore this email.`,
      html: `<div style="margin:0;background:#f4f7fb;padding:36px 16px;font-family:Arial,sans-serif;color:#14213d"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:36px"><div style="font-size:14px;font-weight:700;letter-spacing:.04em;color:#2563eb">SKILLBRIDGE</div><h1 style="margin:20px 0 12px;font-size:26px">Reset your password</h1><p style="line-height:1.6;color:#475569">We received a request to reset your SkillBridge password. Use the button below within 30 minutes.</p><p style="margin:28px 0"><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Choose a new password</a></p><p style="line-height:1.6;color:#64748b;font-size:13px">If you did not request this, you can safely ignore this email. Your password will not change.</p></div></div>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider returned status ${response.status}.`);
  }
}

async function sendWithBrevo(recipient: string, resetUrl: string): Promise<void> {
  const { name, email } = parseSender(env.brevoFromEmail!);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.brevoApiKey!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name, email },
      to: [{ email: recipient }],
      subject: "Reset your SkillBridge password",
      textContent: `We received a request to reset your SkillBridge password. Use this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request a reset, you can ignore this email.`,
      htmlContent: `<div style="margin:0;background:#f4f7fb;padding:36px 16px;font-family:Arial,sans-serif;color:#14213d"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:36px"><div style="font-size:14px;font-weight:700;letter-spacing:.04em;color:#2563eb">SKILLBRIDGE</div><h1 style="margin:20px 0 12px;font-size:26px">Reset your password</h1><p style="line-height:1.6;color:#475569">We received a request to reset your SkillBridge password. Use the button below within 30 minutes.</p><p style="margin:28px 0"><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Choose a new password</a></p><p style="line-height:1.6;color:#64748b;font-size:13px">If you did not request this, you can safely ignore this email. Your password will not change.</p></div></div>`,
    }),
  });

  if (!response.ok) throw new Error(`Brevo returned status ${response.status}.`);
}

function parseSender(value: string): { name: string; email: string } {
  const match = value.match(/^\s*(.*?)\s*<([^<>\s]+)>\s*$/);
  if (match) return { name: match[1] || "SkillBridge", email: match[2] };
  return { name: "SkillBridge", email: value.trim() };
}
