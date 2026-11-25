# Google and LinkedIn sign-in

The login and signup pages support Google and LinkedIn OAuth sign-in. Provider secrets stay on the Render API. A user's provider ID is stored separately from their email; email/password accounts with a matching verified provider email are linked to the existing account. New social accounts continue through the existing SkillBridge onboarding flow.

## Google

1. Create an OAuth client in Google Cloud Console with application type **Web application**.
2. Add the SkillBridge website origin to **Authorized JavaScript origins** (for example, the production Vercel URL).
3. Add this exact **Authorized redirect URI**: `https://YOUR-WEBSITE-ORIGIN/api/v1/auth/oauth/google/callback`.
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the Render API environment.

## LinkedIn

1. Create a LinkedIn developer app and enable **Sign In with LinkedIn using OpenID Connect**.
2. Add this exact redirect URL to the app: `https://YOUR-WEBSITE-ORIGIN/api/v1/auth/oauth/linkedin/callback`.
3. Add `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` to the Render API environment.

For both providers, set `CLIENT_ORIGIN` on Render to the same website origin used in the callback URLs, without a trailing slash. Vercel's `/api/v1` rewrite forwards the callback to Render while keeping the session cookie on the website origin. After changing environment values, redeploy the Render API. Local development needs the matching localhost callback registered with each provider.

Provider email must be marked verified for automatic account creation or linking. LinkedIn may omit that field; in that case its sign-in is refused and the person can use email/password instead.
