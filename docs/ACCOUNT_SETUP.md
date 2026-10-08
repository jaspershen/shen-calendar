# Account setup: email and Google

The website remains a static GitHub Pages site. Supabase provides authentication and a per-user database. No login is simulated: until configured, browser-only usage remains available and authentication buttons explain the missing setup.

## 1. Create a Supabase project

Create a project at https://supabase.com/dashboard. In its SQL Editor run `docs/auth-schema.sql` once. It enables row-level security and permits authenticated users to read, insert, and update only their own calendar row. Anonymous users cannot access this table.

In `config.js` enter the project's URL and **publishable key**. A legacy anon key also works. These are public browser configuration. Never put a service_role key, secret key, database password, or Google client secret in this repository.

## 2. Configure email authentication

Under Authentication, enable the Email provider and allow new registrations. Keep email confirmation enabled. Use a minimum password length of at least eight characters.

Under URL Configuration set Site URL to your eventual Pages URL, including the repository path, for example `https://YOUR-USER.github.io/shen-calendar/`. Add that exact URL to Redirect URLs. For local testing also add `http://127.0.0.1:8080/` and `http://localhost:8080/`.

Configure a production SMTP provider for public registrations and password reset emails. Supabase's default mail service has restrictions and is intended for initial testing. Check current mail limits before inviting users.

## 3. Configure Google

In Google Cloud Console configure Google Auth Platform branding, audience, and a Web application OAuth client. For a general audience use an external app; while in testing add your test users.

Add your website's origin (scheme and host, without the repository path) and local test origin as appropriate. Add the **Supabase callback URL shown in the Google provider panel** as an authorized redirect URI, typically `https://PROJECT-REF.supabase.co/auth/v1/callback`.

In Supabase Authentication → Providers → Google, enable Google and enter the Google Client ID and Client Secret there. Do not place the secret in the website files or share it in chat. Move Google's app out of testing when ready to admit public users and complete any verification Google requires for your configuration.

## 4. Verify before publishing

1. Register with email and confirm the emailed link; sign in and sign out.
2. Sign in with Google and verify redirect back to the correct repository path.
3. Save a task, refresh, then sign in on a second device and confirm it loads.
4. Register two test accounts. Confirm neither can view or update the other's `calendar_state` row, including via direct API requests with their own session token.
5. Request a password reset and complete it from the email link.
6. Confirm signing out restores only local browser tasks, not the previous user's cloud tasks.
7. Test importing browser tasks explicitly: cloud and browser storage are kept separate, and duplicate task IDs are skipped.
8. Open two devices, edit the same cloud snapshot, and confirm a stale save is rejected with a reload message. This version uses revision checks to prevent silently overwriting newer data. Refresh to fetch edits from another device; live updates are not yet enabled.

Account sign-in and data isolation need live project verification; local unit tests cannot confirm an external provider or database policy.

## Privacy and operations

Before public release, publish a privacy notice explaining that email/account identity and tasks are processed by Supabase and that Google sign-in uses Google. Keep the project under your account, configure email delivery, and monitor service quotas. This implementation does not send daily email or background push reminders.

Local deadline values are interpreted in the device's current time zone. Automatic conversion when travelling between time zones is not implemented.

## Official references

- Google login: https://supabase.com/docs/guides/auth/social-login/auth-google
- Email/password: https://supabase.com/docs/guides/auth/passwords
- Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
