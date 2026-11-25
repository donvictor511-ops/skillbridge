# Password reset email setup

SkillBridge sends password reset links through Brevo's HTTPS API or Resend. Reset links expire after 30 minutes, can be used once, and invalidate the account's existing sessions after the password changes. You do not need to buy a website domain to use Brevo, but you need a Brevo account and a sender email address you can verify.

1. Create a Brevo account and verify a sender email address that you can access.
2. Create a Brevo API key.
3. In the Render `skillbridge-api` service, add these environment variables:
   - `BREVO_API_KEY`: the Brevo API key.
   - `BREVO_FROM_EMAIL`: the verified sender address, optionally with a display name, such as `SkillBridge <you@example.com>`.
4. Save the variables and redeploy the API. The server calls Brevo over HTTPS, so this works on Render Free without SMTP ports.

Brevo allows a sender email to be verified without owning a custom website domain. Sender providers may rewrite or filter messages from free email addresses, so a domain you own is still recommended later for reliable branded delivery. Resend remains supported as an alternative through `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; Resend production delivery requires a verified sending domain. If both providers are configured, Brevo is used.

The reset page uses the existing `CLIENT_ORIGIN` to build the link back to the website. Keep the Resend key on the API only; never add it to Vercel or the browser app.

The API deploy command runs `prisma migrate deploy`, which applies the password reset token migration automatically.
