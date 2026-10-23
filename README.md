# Grip Restore

A web-based rehabilitation game for stroke survivors and arthritis patients. Grip Restore turns hand-exercise therapy into a rhythm-driven experience — your webcam tracks your hand movements while you complete guided grip exercises, and your sessions are saved to your account.

## Features

- **Real accounts** — register, log in, log out, and email verification (required before login)
- **Password recovery** — single-use, time-limited reset links; resetting signs out every session
- **Account settings** — change your password (signs out other devices) or sign out everywhere
- **Server-side sessions** — httpOnly cookie sessions backed by SQLite, so accounts and progress survive browser resets and work across devices
- **Dashboard** — weekly summary with accuracy, sessions completed, and best streak
- **Start Session** — pick a 5 or 10 minute session and an Easy, Medium, or Hard difficulty; the difficulty is suggested from your recent accuracy
- **Webcam Setup** — requests camera permission and shows a live, mirrored preview
- **Calibration** — 3-step hand calibration (Pinch, Fist, Open Palm)
- **Gameplay** — gesture icons fall down three lanes; match each gesture when it reaches the target line
- **Live scoring** — hits, misses, accuracy, sound feedback, and a 3-2-1 countdown
- **History** — weekly charts and the most recent sessions, loaded from your account

## Tech Stack

**Frontend:** React 19 + Vite, react-router-dom 7, motion, MediaPipe Tasks Vision 1.1.0 (pinned), hand-rolled CSS tokens.

**Backend:** Node.js 24 (built-in `node:sqlite`), Express 5, zod, helmet, express-rate-limit, nodemailer.

Password hashing uses `scrypt` (N=2^15, r=8, p=1) with a 16-byte salt, a 64-byte key, and an HMAC pepper. Session and recovery tokens are stored as SHA-256 hashes only.

## Repository layout

```
Grip_Restore/
├─ backend/
│  ├─ src/
│  │  ├─ auth/           # passwords, tokens, sessions, middleware
│  │  ├─ db/             # SQLite open + migrations
│  │  ├─ http/           # cookie helpers
│  │  ├─ middleware/     # CSRF, rate limits, validation
│  │  ├─ routes/         # /auth and /api/sessions
│  │  ├─ validation/     # zod schemas
│  │  ├─ app.js          # Express wiring
│  │  ├─ config.js       # env parsing + prod fail-closed checks
│  │  └─ server.js
│  ├─ test/              # node --test API tests
│  └─ .env.example
├─ docs/                 # implementation guide
├─ frontend/
│  ├─ src/
│  │  ├─ api/            # typed-ish fetch wrapper + auth/session calls
│  │  ├─ components/     # shared UI (Navbar, WebcamCard, Charts, …)
│  │  ├─ context/        # auth, webcam, hand-tracking providers + hooks
│  │  ├─ data/           # pure progress derivations (+ tests)
│  │  ├─ game/           # pure gameplay engine, sounds (+ tests)
│  │  ├─ pages/          # one file per route
│  │  ├─ styles/         # tokens + per-page CSS
│  │  └─ vision/         # MediaPipe loader, classifier, skeleton renderer
│  └─ vite.config.js     # dev proxy for /auth and /api
└─ package.json          # root dev/test scripts
```

## Prerequisites

- **Node.js 24+** — the backend uses the built-in `node:sqlite` module.
- A webcam and a browser with `getUserMedia` support.

## Getting started

```bash
npm run install:all
```

Create `backend/.env` from the example (the dev defaults work without any changes):

```bash
cp backend/.env.example backend/.env
```

Start the API (`:3001`) and Vite dev server (`:5173`) together:

```bash
npm run dev
```

Open `http://localhost:5173`.

### Email in development

With no SMTP configured, verification and reset emails are printed to the API console, including a clickable link. The API response also includes `devVerifyUrl` / `devResetUrl` in development so the UI can offer a direct "Open link (dev)" shortcut. Configure SMTP in `backend/.env` to send real mail.

### Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` requires `PASSWORD_PEPPER` and rejects requests without a trusted `Origin` |
| `PORT` | `3001` | API port |
| `APP_URL` | `http://localhost:5173` | Base URL used in email links |
| `APP_ORIGIN` | `http://localhost:5173,http://localhost:5199` | Comma-separated CSRF allowlist |
| `DATABASE_PATH` | `backend/data/grip-restore.db` | Relative to `backend/` (gitignored) |
| `PASSWORD_PEPPER` | dev-only fallback | **Required in production**; changing it invalidates all passwords |
| `TRUST_PROXY` | `0` | Set `1` behind a reverse proxy so rate limits see the real client IP |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | unset / `587` / `false` | Any one of nodemailer's supported hosts |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | empty / `Grip Restore <no-reply@…>` | Credentials + From header |
| `VITE_API_BASE` | empty | Frontend only; use when the API is not same-origin (cookies need CORS credentials) |

### Troubleshooting

- **"The API server is not running" / registration fails** — start the dev servers from the **repository root**, not from `frontend/` or `backend/`:

  ```bash
  npm run dev
  ```

  The frontend alone (`npm --prefix frontend run dev`) has no API to talk to; check `http://localhost:3001/health` returns `{ "ok": true }`.
- **Port 5173 already in use** — an earlier dev server is still running. Stop it (`Ctrl+C` in its terminal) and run `npm run dev` again.
- **Emails aren't arriving** — without SMTP configured, verification and reset links are printed in the API terminal. They also appear as "Open link (dev)" shortcuts in the UI.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API + Vite together (`concurrently`) |
| `npm run dev:api` / `npm run dev:web` | Run one side only |
| `npm test` | Backend API tests, then frontend pure-module tests |
| `npm run lint` | ESLint on the frontend |
| `npm run build` | Production frontend build |
| `npm run install:all` | Install root, backend, and frontend dependencies |

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | — | Create an unverified account; returns a generic message (+ dev link) |
| `POST` | `/auth/login` | — | Start a session; `403 EMAIL_NOT_VERIFIED` until verified |
| `POST` | `/auth/logout` | cookie | Revoke the current session |
| `POST` | `/auth/logout-all` | cookie | Revoke every session for the account |
| `POST` | `/auth/change-password` | cookie | Verify the current password, set a new one, revoke other sessions |
| `GET` | `/auth/me` | cookie | Current user |
| `POST` | `/auth/forgot-password` | — | Email a reset link (always a generic response) |
| `POST` | `/auth/reset-password` | — | Set a new password; revokes all sessions |
| `POST` | `/auth/verify-email` | — | Consume a verification token |
| `POST` | `/auth/resend-verification` | — | Issue a new verification token (invalidates the old one) |
| `GET` | `/api/sessions` | cookie | The signed-in user's sessions, newest first |
| `POST` | `/api/sessions` | cookie | Save a completed session (accuracy recomputed server-side) |

Rate limits: login 10 / 15 min per IP+email, register 5 / hour, recovery 5 / hour. Five failed logins lock the account for 15 minutes. All responses use generic messages to avoid account enumeration.

## Security notes

- Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` + `__Host-` prefix in production, 30-day TTL with sliding renewal after 15 days, max 10 sessions per user.
- CSRF: Origin/Referer allowlist on every state-changing request (missing Origin is rejected in production).
- Helmet: restrictive CSP for the API (`default-src 'none'`), `frame-ancestors 'none'`, no-referrer, no `X-Powered-By`; `Permissions-Policy: camera=(self)`.
- Validation: strict zod schemas (unknown keys rejected), 16 kB JSON body limit.
- Every query is scoped by the session's `user_id`; the client never supplies a user id.

## Camera architecture

A single `MediaStream` lives in `WebcamProvider`, above the keyed `<Routes>`, and is reused across Setup → Calibration → Game. It is released when the path leaves the session flow or on logout. Camera access requires `localhost` or HTTPS.

## Tests

```bash
npm test
```

- Backend (`backend/test/`): registration + verification, login/lockout, password reset + session revocation, per-user session isolation, validation, and security headers.
- Frontend: gameplay engine and pure progress derivations.

## Known limitations

- Email delivery is console-only until SMTP is configured.
- Rate-limit and lockout counters live in memory, so they reset when the API restarts (single-instance deployments only).
- Leaving `/game` through the Navbar or browser Back does not save partial progress; only **Quit session** does.
- Refreshing `/game` loses duration/difficulty/calibration route state and restarts with defaults.
- Calibration data is stored with sessions but does not influence gameplay yet.
- `node:sqlite` is still flagged experimental in Node 24 (warnings are suppressed in the npm scripts).
