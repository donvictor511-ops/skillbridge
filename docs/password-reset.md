# Password reset email setup

SkillBridge sends password reset links through Resend. Reset links expire after 30 minutes, can be used once, and invalidate the account's existing sessions after the password changes.

1. Create a Resend account and add a domain you control.
2. Add the DNS records Resend provides, then wait until the domain is verified.
3. Create an API key with permission to send email.
4. In the Render `skillbridge-api` service, add these environment variables:
   - `RESEND_API_KEY`: the new Resend API key.
   - `RESEND_FROM_EMAIL`: for example, `SkillBridge <no-reply@mail.yourdomain.com>`, using the verified domain.
5. Save the variables and redeploy the API.

The reset page uses the existing `CLIENT_ORIGIN` to build the link back to the website. Keep the Resend key on the API only; never add it to Vercel or the browser app.

The API deploy command runs `prisma migrate deploy`, which applies the password reset token migration automatically.
