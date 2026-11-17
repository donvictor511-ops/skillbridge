# SkillBridge Security Notes

## Currently protected

- Passwords are hashed before storage.
- Authentication uses server-managed sessions.
- Session cookies are HttpOnly and SameSite=Lax.
- Protected routes require a valid session.
- Logout invalidates the session.
- Registration and login validate input.
- Extra registration fields are ignored.
- Error responses do not expose stack traces.
- CORS allows the configured frontend origin.

## Not yet completed

- Production HTTPS and secure cookie configuration.
- Rate limiting for authentication endpoints.
- Email verification.
- Password reset.
- Multi-factor authentication.
- Automated security testing and monitoring.
- Production deployment security review.

These notes describe the current development stage, not a guarantee of production security.

| Profile privacy | One pure function decides who may see a profile (public, members, private). A private profile answers exactly like a missing one. A visitor sees an allow-listed set of fields, never email, goals, or timestamps |
| Ownership | Every edit uses the user id from the session and checks ownership inside the database command. Another person's entry gives the same 404 as a missing one |
| Caching | Every profile response, errors included, is `Cache-Control: private, no-store` |
| Hidden characters | A null character (code 0) in any text is refused with a 400 |
