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
