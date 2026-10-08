# Shen Calendar

A personal deadline planner for GitHub Pages. Browser-only mode needs no backend. Optional Supabase accounts enable email registration, email/password login, Google login, and cloud task storage.

## Run locally

Run `npm start` and open http://localhost:8080.

- Add, edit, and delete tasks with deadlines precise to the minute, priorities, and notes.
- The board shows days remaining, deadlines today, and overdue tasks. Due statistics include Due today, Due within 3 days (next 72 hours), and a configurable 1–365 day window (default 7). The custom window is saved in this browser. These overlapping counts include only unfinished tasks whose deadline has not passed.
- Switch between the board, monthly calendar, and Timeline pages.
- On mobile, Timeline uses task cards with individual date tracks, exact deadlines, and countdowns; desktop retains the daily grid. Navigation, forms, and task controls adapt to narrow screens.
- Timeline shows one task per row and one day per column, with a today marker and deadline diamonds. Bars represent the interval from today to the deadline, not estimated work duration. Overdue intervals appear in rose. Select a 30, 60, or 90 day window, navigate date ranges, or return to today. Arrow markers indicate deadlines outside the visible window.
- Filter active, completed, or all tasks and search titles and notes.
- Complete tasks using the round button; click again to reopen them.
- Export JSON backups. Import replaces current tasks after confirmation.

Tasks are stored only in this site's localStorage in the current browser. They are not uploaded to GitHub and do not sync across devices. Export backups regularly. Changing browsers, website addresses, or clearing browser storage requires restoring a backup.

Reminders appear when the website is open. Countdown values refresh every minute and show days/hours or hours/minutes. Deadlines use the device's local time zone, displayed in the editor. Same-day deadlines become overdue as soon as their time passes. Existing date-only tasks and backups are interpreted as 23:59 on that date. Timeline columns remain daily, while row labels and deadline tooltips include the exact time. No email or push notifications are sent when the page is closed. Existing task names and notes are preserved as entered.

## Deploy to GitHub Pages

1. Upload these files to a GitHub repository using the `main` branch.
2. In Settings → Pages → Build and deployment, select GitHub Actions as Source.
3. Push code or manually run the Deploy GitHub Pages workflow.
4. Open the website URL displayed in Pages after deployment succeeds.

The workflow publishes the UI modules plus `account.js` and public `config.js`. Follow [Account setup](docs/ACCOUNT_SETUP.md) to configure authentication and database policies. Public keys are allowed; privileged secrets must never be included. Keep personal JSON backups out of a public repository.

## Validation

Run `npm test` to check calendar date boundaries and backup validation.

## Accounts

Use Sign in / Register to access email and Google authentication. Real login remains unavailable until configured. Signed-in tasks are stored per account; signing out restores browser-only tasks. Import browser tasks explicitly to copy existing plans into your account. Accounts fetch cloud tasks on sign-in or reload; simultaneous edits use revision checks and reject stale writes. Live provider and two-user isolation tests are required before public release.

Unfinished overdue tasks appear in a persistent Past due reminder section on every view, regardless of search or task filters. Mark complete removes the reminder; reopening a past-due task restores it. Reminders are shown in the page while open, not sent as background notifications.

The main introduction, due statistics, and daily briefing appear only on Deadline board. Timeline and Calendar have compact page headings and retain an Add task action.

Click a due statistic or Overdue to filter the board list. Click it again or Clear filter to reset. Status tabs clear the deadline filter. Clicking a metric clears search, so its list corresponds to the displayed count; subsequent searches narrow that list. Timeline and Calendar are not restricted by the board deadline filter.

## Import Outlook calendars

Use Import calendar to choose an `.ics` export, preview events, and import selected items without replacing existing tasks. Event start times become deadlines; VTODO uses DUE. All-day deadlines use 23:59. UTC and supported IANA time zones are converted to device local time. Common Outlook Windows zones are mapped; unsupported zones, cancelled events, and recurring items are skipped with an explicit report. Reimporting the same event identity skips duplicates. This is a snapshot import, not automatic Outlook synchronization. Classic Outlook: Calendar → File → Save Calendar, then choose date range and export `.ics`.
