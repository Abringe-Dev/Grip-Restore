# Grip Restore

A web-based rehabilitation game for stroke survivors and arthritis patients. Grip Restore turns hand-exercise therapy into an engaging, rhythm-driven experience — your webcam tracks your hand movements while you complete guided grip exercises.

## Features

- **Auth-protected app** — mock login/register (localStorage) with guarded routes
- **Dashboard** — home overview with progress stats and a quick Start Session entry point
- **Start Session** — pick a 5 or 10 minute session and an Easy, Medium, or Hard difficulty
- **Webcam Setup** — requests camera permission and shows a live, mirrored preview
- **Calibration** — 3-step hand calibration (Pinch, Fist, Open Palm) with gesture prompts
- **Gameplay** — gesture icons fall down three lanes; match each gesture when it reaches the target line
- **Live scoring** — tracks hits, misses, and accuracy, with sound feedback and a 3-2-1 countdown
- **History** — weekly summary, accuracy trend and sessions-per-week SVG charts, plus recent sessions with difficulty and hit/miss counts

## Tech Stack

- **React 19** + **Vite**
- **react-router-dom** for routing
- **motion** for page transitions
- **getUserMedia** for the live webcam stream
- **MediaPipe Tasks Vision** for real-time hand landmark tracking and gesture recognition
- Hand-rolled design system (CSS tokens) derived from Figma

## Camera architecture

A single `MediaStream` is held in a shared `WebcamProvider` (React context) that lives **above** the route transitions, so the same live feed persists across the whole rehabilitation session:

- Camera is requested **once** on the Webcam Setup page
- The stream is reused across Setup → Calibration → Game (no re-permission prompt, no feed restart)
- The camera is released only when the session ends — leaving Setup/Calibration/Game or logging out

> Camera access requires **HTTPS or localhost**. The Vite dev server qualifies; a production deployment needs HTTPS.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

The app opens at the address Vite prints (default `http://localhost:5173`). Log in with any credentials to enter the app.

## Scripts

| Script      | Description                |
| ----------- | -------------------------- |
| `npm run dev`    | Start the dev server       |
| `npm run build`  | Production build to `dist` |
| `npm run lint`   | Run ESLint                 |
| `npm test`       | Run the gameplay and session-store tests |
| `npm run preview`| Preview the production build |

## Roadmap

- Backend for real user accounts, session storage, and cross-device progress persistence
- Adaptive difficulty based on recent accuracy and fatigue
- More gesture variety and therapist-configurable exercise plans
