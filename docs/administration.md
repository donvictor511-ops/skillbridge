# Administration and moderation

Platform administration is available at `/admin` to accounts whose database role is `admin`. All admin API endpoints enforce the role on the server.

## Set up the first administrator

Apply the new moderation migration and regenerate Prisma Client:

```powershell
cd server
npx prisma migrate deploy
npx prisma generate
```

Promote an existing account using a private server terminal:

```powershell
npm run admin:set -- member@example.com admin
```

Use `member` in place of `admin` to remove administrator access. Do not expose this command as a public API route.

## Dashboard capabilities

- Platform totals for members, posts, comments, communities, jobs, projects, applications, messages, and pending reports.
- Searchable member management with seven-day restrictions, suspensions, and restoration.
- Unified review queue for profile, post, comment, and community reports.
- Held-content inbox for repeated identical posts and comments, with approve/remove decisions and administrator alerts.
- Remove reported posts, comments, and community discussions from the active site while keeping report snapshots and administrative action records.
- Moderation history with the administrator, target, decision, reason, and timestamp.
- In-app administrator alerts when members report content or submit account appeals.
- An appeals inbox for suspended or restricted accounts, with accept/restore or deny decisions and a note recorded for the member and audit history.

Account restrictions block profile/content edits, posting, connection changes, messaging, and marketplace submissions until expiry. Suspensions invalidate existing sessions and prevent new sessions from being used.

Suspended members can appeal from the login screen after verifying their email and password. Restricted members see the restriction reason and expiry on their dashboard and can submit an appeal there. An administrator reviews pending appeals under **Admin → Appeals**. Accepting an appeal restores account access; denying it leaves the action in place. New reports and appeals appear in the administrator notification bell and have a count in the admin navigation.

The public **Community guidelines** page is the source members can read before posting. The current automatic screening is deliberately narrow: it catches a third identical text within 24 hours from the same author and holds it for review. It does not decide whether content is harassment, a scam, or otherwise harmful. See [the guideline text and enforcement approach](community-guidelines.md).
