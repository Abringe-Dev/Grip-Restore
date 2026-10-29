<!--
Draft for an IEEE-style conference paper. Replace the author, affiliation, and
funding placeholders before submission. All quantitative implementation and
test values reflect the repository state summarized in this draft; no
human-subject study, clinical trial, or usability evaluation was conducted.
-->

# Grip Restore: A Web-Based, Webcam-Controlled Serious Game for Home Hand Rehabilitation

**First A. Author**, **Second B. Author**

*Department of Computer Science, Institution Name*

*City, Country*

*first.author@example.edu, second.author@example.edu*

---

**Abstract**—Hand rehabilitation after stroke and in hand osteoarthritis depends on frequent, correctly performed exercise, yet home programs often struggle with adherence and limited feedback. This paper presents Grip Restore, a browser-based serious game that uses a consumer webcam and MediaPipe Hands to turn three functional grip patterns—pinch, fist, and open palm—into a three-lane falling-note game and a hold-based practice mode. Perception runs locally in the browser; no specialized hardware, installable client, or depth sensor is required. A rule-based classifier normalizes landmark distances by hand size, applies pinch hysteresis and three-frame temporal confirmation, and reports confidence as pose strength rather than label probability. A precomputed note schedule, a 50 ms game tick, and three timing presets provide graded motor demands. Per-gesture statistics feed an explainable weekly forecast, focus recommendations, and a next-session difficulty suggestion. The full-stack implementation combines React 19, Express 5, and SQLite with scrypt password hashing, server-side cookie sessions, CSRF protection, rate limiting, and strict request validation. Automated verification comprises 29 backend and 38 frontend tests, a clean production build, and a separately bundled 153.90 kB MediaPipe vision chunk. We do not report clinical or human-subject outcomes; instead, we document the design, implementation, and verification of the system and identify the studies required before clinical use.

**Index Terms**—assistive technology, gesture recognition, hand rehabilitation, MediaPipe, serious games, telerehabilitation, web applications.

## I. Introduction

Stroke is a leading cause of long-term disability worldwide, and recovery of hand function is central to independence in activities of daily living [1]. Hand osteoarthritis is another common source of pain, stiffness, and reduced grip function, for which exercise is a standard component of management [3]. In both populations, meaningful gains depend on regular practice, yet home exercise programs are frequently performed below the prescribed dose. Telerehabilitation can extend therapy beyond the clinic [2], and digital interventions have been investigated as a way to support adherence to home exercise [4]. However, remote programs still need to observe performance, provide immediate feedback, and make progression understandable to the person exercising.

Serious games address some of these needs by embedding repetitive movement in an interactive task. Systematic reviews and meta-analyses of upper-limb rehabilitation games report encouraging but heterogeneous evidence, with variation in hardware, game design, intervention dose, and outcome measurement [5]–[7]. Many systems rely on virtual-reality headsets, depth cameras, instrumented gloves, or custom controllers. These approaches can provide rich sensing, but cost, setup burden, hygiene, and technical support may limit deployment in ordinary homes. Camera-based hand tracking offers a lower-cost alternative. MediaPipe Hands provides real-time 21-landmark hand tracking in the browser [10], and recent work has examined its validity for clinical hand tracking [11]. Nevertheless, a practical home system must also handle unstable classifications, structure exercise over time, explain adaptation, and protect longitudinal health-related data.

Grip Restore was designed around these constraints. It runs in a standard browser, uses a single webcam stream, and maps three grasp patterns to a rhythm-style game and a focused practice mode. The system records per-user sessions and per-gesture accuracy, derives weekly progress and a next-session plan, and presents recommendations with plain-language reasons. It is not a medical device and has not been evaluated with patients. The contribution of this paper is therefore an engineering and interaction design account, not a claim of clinical efficacy.

The main contributions are:

1. A browser-only hand-perception pipeline that combines MediaPipe landmarks, hand-size-normalized rule-based classification, pinch hysteresis, and three-frame temporal confirmation to reduce flicker without specialized hardware.
2. Two complementary exercise modes: a three-lane falling-note game with graded timing demands, and a hold-based single-grip practice mode that emphasizes steady grasp maintenance.
3. Explainable longitudinal feedback: per-gesture accuracy, weekly summaries, a trend-adjusted forecast, a 7-day plan, and a difficulty recommendation derived from recent performance.
4. A secure full-stack architecture with email-verified accounts, password recovery, server-side cookie sessions, per-user data scoping, CSRF protection, rate limiting, and strict validation.
5. A reproducible verification baseline built on pure logic modules and API integration tests, with explicit reporting of what has and has not been evaluated.

The remainder of the paper reviews related work (Section II), describes the system design (Section III), explains the exercise and adaptive logic (Section IV), reports implementation and verification results (Section V), and discusses strengths, limitations, and future work (Section VI).

## II. Related Work

### A. Telerehabilitation and Home Exercise

Telerehabilitation can improve access to stroke rehabilitation and support continuity of care [2]. For hand osteoarthritis, exercise is widely recommended, although the evidence base has limitations [3]. A recurring challenge is adherence: home programs compete with daily routines and often lack the supervision, cueing, and feedback available in a clinic. Lang et al. reviewed randomized trials of digital interventions for home exercise adherence and found that digital support can help, but the evidence is mixed across conditions and intervention designs [4]. This motivates systems that make exercise visible, immediate, and progress-oriented rather than merely distributing instructions.

### B. Serious Games for Upper-Limb Rehabilitation

Proença et al. reviewed serious games for upper-limb rehabilitation and highlighted diverse genres, sensors, and targets [5]. Doumas et al. [6] and Wang et al. [7] synthesized stroke trials and reported promising but heterogeneous effects. These reviews show potential for repetition and engagement, but many studies are small, short, and use bespoke systems. Szturm et al. evaluated an in-home game platform [8]; Lockery et al. developed adaptive hand-finger tracking [9]; Bouatrous et al. proposed an adaptive VR exergame [12]; and Chen et al. demonstrated real-time gesture-based play [13]. Grip Restore differs by targeting ordinary browsers and webcams, combining two modes, and making progression explainable.

### C. Camera-Based Hand Sensing

MediaPipe Hands introduced on-device real-time hand landmark tracking [10]. Browser deployment lowers the barrier to camera interaction, but monocular tracking is sensitive to lighting, occlusion, orientation, and distance. Amprimo et al. validated Google MediaPipe Hand and a depth-enhanced variant, finding useful agreement while showing task-dependent error [11]. These findings favor conservative design: tolerate landmark noise, normalize thresholds by hand size, and fail safely. Grip Restore follows these principles but does not claim measurement-grade accuracy.

Existing work establishes the feasibility of game-based hand rehabilitation and the accessibility of browser-based hand tracking. Grip Restore is positioned at their intersection: hardware-free deployment, two exercise modes, explainable progression, and secure longitudinal persistence. Its evaluation is deliberately limited to automated verification and implementation evidence; clinical effectiveness and usability remain open questions.

## III. System Design

### A. Design Requirements

Table I summarizes the guiding requirements: accessibility, robust interaction, graded exercise, understandable feedback, secure persistence, and testability. The system also degrades gracefully—if the camera or tracker is unavailable, the game pauses rather than assigning misses.

**TABLE I. Design Requirements and Corresponding Mechanisms**

| Requirement | Design response |
|---|---|
| Low-cost access | Browser client; consumer webcam; no installable runtime |
| Robust gesture input | Hand-size normalization; hysteresis; 3-frame confirmation |
| Graded exercise | 5/10 min sessions; Easy/Medium/Hard; game plus practice |
| Understandable progress | Per-gesture accuracy; weekly summary; explained forecast |
| Secure personal data | Verified accounts; cookie sessions; scoped queries; CSRF |
| Testable logic | Pure gameplay, practice, and analytics modules |
| Graceful failure | Camera states; pause on tracking loss; retry paths |

### B. Architecture

The client is a single-page application built with React 19.2, Vite 8.2, React Router 7.18, and Motion 13.1. The server is a Node.js 24 application using Express 5, zod validation, helmet, express-rate-limit, and nodemailer. Persistence uses the built-in `node:sqlite` module in WAL mode with foreign keys enabled. MediaPipe Tasks Vision 1.1.0 is pinned and loaded lazily so that the vision runtime does not inflate the initial bundle.

The provider tree is shallow: `AuthProvider` wraps `WebcamProvider`, which wraps `HandTrackingProvider`. The latter two sit above the keyed route tree, so one `MediaStream` and one animation-frame loop survive navigation from setup through calibration, game, and practice; leaving the session flow releases both. Session configuration travels in router location state, and the game validates it against safe defaults.

Fig. 1 shows the data path. The browser captures video, detects landmarks, and classifies gestures locally, sending only session summaries, practice attempts, and account data to the API. The server stores accounts, hashed tokens, game sessions, and practice totals in SQLite; it never receives raw video.

```
+---------------------------- Browser (React 19 + Vite) ----------------------------+
|  WebcamProvider -> hidden <video> -> HandTrackingProvider (requestAnimationFrame)  |
|        |                                  |                                       |
|        +-> mirrored preview + canvas      +-> MediaPipe HandLandmarker             |
|                                           +-> classifyGesture()                   |
|                                           +-> 3-frame confirmation                |
|                                                                                   |
|  Routes: Setup -> Calibration -> Game | Practice | Dashboard | Plan | History      |
|  Pure modules: fallingGame, gestureStats, practiceEngine, analytics, sessionStore  |
+---------------------------------------+-------------------------------------------+
                                        | HTTPS/JSON, HttpOnly cookie
+---------------------------------------v-------------------------------------------+
| Express 5 API: auth, sessions, practice, CSRF, rate limits, zod validation         |
| SQLite (node:sqlite, WAL): users, auth_sessions, tokens, game_sessions,            |
| practice_progress                                                                  |
+-----------------------------------------------------------------------------------+
```

**Fig. 1.** High-level architecture. Perception remains on the client; the server persists derived exercise and account data.

The client-server contract is a small JSON API. Authentication endpoints cover registration, verification, login, logout, password change, and recovery. Session endpoints list and create game sessions; practice endpoints read per-gesture totals and append one attempt. Protected routes resolve the user from the cookie, and the client never supplies a user identifier.

### C. Hand-Tracking Pipeline

`WebcamProvider` requests a user-facing camera with `getUserMedia` and exposes idle, requesting, active, denied, unsupported, and error states. The preview is mirrored, while a hidden 2×2 video element supplies detection frames without coupling inference to display size.

`HandLandmarker` is created with a 15 s timeout, trying the GPU delegate before the CPU delegate. Detection runs in a requestAnimationFrame loop and skips frames when the video is not ready, `currentTime` has not advanced, or a timestamp would violate the detector contract. FPS is measured over 500 ms and state updates only on integer changes. Overlays resize with device-pixel ratio capped at 2 and use the preview's crop transform.

Each hand produces 21 landmarks. The classifier is stateless per frame; the provider adds temporal stability. A raw reference serves low-latency consumers, while `currentGesture` is confirmed only after three consecutive agreeing frames. Gameplay and practice use the confirmed value, so a single-frame misread cannot score a hit or start a hold.

### D. Server, Data, and Security

Migrations are forward-only via `PRAGMA user_version`. Version 1 creates users, sessions, verification and reset tokens, and game sessions; version 2 adds a JSON `gesture_stats` column; version 3 adds `practice_progress`, keyed by user and gesture with cascading foreign keys.

Passwords are hashed with scrypt (`N = 2^15`, `r = 8`, `p = 1`) using a 16-byte random salt, a 64-byte key, and an HMAC-SHA256 pepper. Session and recovery tokens are random 32-byte values stored only as SHA-256 hashes. The session cookie is `HttpOnly` and `SameSite=Lax`; production uses the `__Host-` prefix and `Secure`, with a 30-day lifetime that slides after 15 days. At most ten sessions are retained per user.

State-changing requests pass through an Origin/Referer allowlist; development allows local Vite ports, while production falls back to the application URL and rejects missing origins. Login, registration, and recovery have separate rate limits, and five failed logins lock the account for 15 minutes. Bodies are limited to 16 kB and validated by strict zod schemas. Helmet sets a restrictive CSP, disables framing, hides `X-Powered-By`, and limits camera permission to the application origin.

Every query is scoped by the authenticated user, and accuracy is recomputed server-side from hits and misses. Validation constrains gestures, counts, duration, difficulty, and calibration shape. These choices reduce the impact of a modified client but do not replace a formal security audit.

## IV. Exercise Design and Adaptive Logic

### A. Gesture Set and Classification

The system uses three grips chosen for functional relevance and visual distinctiveness: pinch (thumb–index opposition), fist (all fingers flexed), and open palm. The gestures are deliberately coarse; the goal is reliable interaction, not joint-angle measurement.

Distances are normalized by hand size, the wrist-to-middle-MCP distance, so thresholds remain comparable at different camera distances. The 12 landmark indices used are checked for finite coordinates; invalid points return `none` at 0.5. Classification follows a fixed priority: fist, pinch, palm, none. A fist requires at least three of four fingertips closer to the wrist than their PIP joints, checked first so a tight fist is not read as a pinch. A pinch requires the thumb and index tips closer than the threshold times hand size. A palm requires all four fingers extended and the thumb extended (thumb tip to pinky MCP > 0.8 times hand size). Table II summarizes the rules.

**TABLE II. Gesture Rules and Thresholds**

| Gesture | Decision rule | Confidence |
|---|---|---|
| Fist | At least 3 of 4 finger tips closer to wrist than their PIP joint | 1.0 if all 4 curled; 0.75 otherwise |
| Pinch | Distance(thumb tip, index tip) < ratio × hand size | Tightness relative to enter ratio |
| Open palm | All 4 fingers extended and thumb extended | 1.0 |
| None | Fallback or invalid landmarks | 0.5 |

Pinch uses hysteresis: enter 0.25, exit 0.35, so an active pinch releases only after crossing the looser threshold. Confidence is pose strength, not label probability: a pinch at the release boundary can read near zero, while an absent hand reads `none` at 0.5. Consumers branch on gesture identity and hold time rather than a single confidence cutoff. Three-frame confirmation adds temporal stability. Calibration holds each gesture for two seconds and records mean confidence; results are saved but do not yet alter classification or gameplay.

### B. Falling-Note Game

The main exercise is a three-lane falling-note game, one lane per gesture. A note spawns at the top, falls linearly, and should be matched when it crosses the hit line at 82% of lane height. Notes are generated once using absolute spawn, hit, and bottom times, so rendering is a pure function of elapsed time.

The first note reaches the line after a 700 ms lead-in plus 82% of the fall duration. Later hit times are separated by a random gap within the difficulty band, and the scheduler never repeats the preceding gesture, encouraging switching without a fixed cycle. A note is a hit when the confirmed gesture matches its lane inside the window, and a miss once the window closes; each resolves once. The 50 ms loop is below the tightest window. Table III lists the presets: slower falls, longer gaps, and wider windows at easier levels. The hit band is `hitWindow / fallTime × 200`, capped at 100%; all presets produce a 20% band, keeping the visual target consistent while timing demand changes.

**TABLE III. Game Difficulty Presets**

| Difficulty | Fall time (ms) | Gap range (ms) | Hit window (ms) |
|---|---:|---:|---:|
| Easy | 3000 | 2400–2800 | ±300 |
| Medium | 2200 | 1600–2000 | ±220 |
| Hard | 1600 | 1100–1400 | ±160 |

Sessions last 5 or 10 minutes and begin with a 3-second countdown. Hits and misses update score, accuracy, and per-gesture counters. If the camera or tracker becomes inactive, the game pauses instead of recording misses. On completion or explicit quit, the client saves the session if at least one note was attempted; quit duration is rounded up from wall-clock time, so paused time is included. Only explicit quit saves partial progress; navigating away unmounts the game without saving. Audio cues are synthesized with Web Audio, unlock after a user gesture, and fail silently. The interface honors reduced motion and exposes timer and progress semantics.

### C. Practice Mode

Practice isolates one grip at a time. The user holds the target for two seconds; a 100 ms tick advances only while the confirmed gesture matches. Success is recorded at two seconds, while releasing or switching earlier records a failure and resets the streak. After success, the grip must be released before another attempt. Time with no hand visible is ignored. The interface shows saved accuracy and streaks per grip, and three consecutive successes trigger a dismissible suggestion to start a play session. Progress is persisted per user and gesture. The modes are complementary: the game stresses timely switching under pressure, while practice stresses steady grasp maintenance.

### D. Progress Analytics and Adaptation

Each game session stores duration, difficulty, hits, misses, total accuracy, and per-gesture hits and misses. The dashboard derives a seven-week summary: current-week accuracy, change from the previous week, sessions completed against a goal of eight, and the best streak of consecutive days with a session. A week with no sessions carries the previous accuracy forward so the chart does not imply a drop to zero. History shows the six most recent sessions.

The forecast uses the five most recent valid sessions. It adds half the difference between the recent average and the preceding five-session average, rounded and capped at ±5 points, then clamps the result to 0–100. Labels are “Likely strong” at 85 or above, “Likely steady” at 70, “Likely mixed” at 55, and “Likely challenging” below 55. Confidence is high with five recent sessions, medium with three or four, and low otherwise.

Per-gesture performance uses each grip’s last three sessions with data. Up to two grips below 75% with at least three attempts are selected for extra focus; otherwise the plan rotates all three. The plan schedules two sessions when recent accuracy is below 60%, four when at least three recent sessions average 85% and the last three are all at least 80%, and three otherwise. Duration is five minutes for no data or low accuracy and ten otherwise, on alternating days at +1, +3, +5, and optionally +7.

The start-screen difficulty suggestion is simpler: it averages the five most recent sessions, steps up at 85% or above, steps down below 60%, and otherwise keeps the last chosen level, capped at Hard; no history suggests Easy. The plan uses the stricter readiness rule above. Both surfaces state their reasons and present the output as guidance, not a predicted clinical outcome.

## V. Implementation and Verification

### A. Implementation

The repository separates pure logic from React components. `fallingGame.js` owns schedule generation, hit and miss boundaries, and score summarization. `practiceEngine.js` owns the hold state machine. `gestureStats.js` owns immutable per-gesture counters. `analytics.js` and `sessionStore.js` own forecasting, planning, weekly summaries, and difficulty recommendations. These modules have no DOM or network dependencies, which allows them to be tested directly with Node’s built-in test runner.

The frontend uses hand-rolled CSS tokens rather than a component framework. The design system defines a light background, teal primary color, per-gesture accent colors, a 44 px minimum touch target, a visible focus ring, and reduced-motion behavior. Charts are static SVG with accessible labels. The backend test harness starts the real Express application on an ephemeral port against a temporary SQLite file, so integration tests exercise routing, middleware, validation, authentication, and persistence together.

### B. Automated Verification

Table IV summarizes the automated suites. The backend has 29 passing tests covering registration, verification, login, lockout, password reset, token invalidation, password change, logout-all, restart persistence, per-user isolation, server-recomputed accuracy, strict validation, ordering, legacy rows, zero-filled practice progress, streaks, cookie flags, headers, origin checks, body limits, rate limiting, SQL-injection handling, password storage, and registration validation.

**TABLE IV. Automated Test Coverage**

| Suite | Tests | Focus |
|---|---:|---|
| Backend authentication | 13 | Registration, verification, login, lockout, reset, account sessions |
| Backend game sessions | 4 | Isolation, validation, accuracy, ordering, legacy rows |
| Backend practice | 3 | Zero-fill, streaks, validation, isolation |
| Backend security | 9 | Cookies, headers, CSRF, limits, SQLi, hashing, origins |
| Frontend gameplay | 11 | Difficulty, scheduling, windows, progress, scoring |
| Frontend gesture stats | 3 | Immutable counting and invalid input |
| Frontend history and recommendations | 10 | Buckets, streaks, summary, difficulty choice |
| Frontend forecast | 6 | Baseline, step-up, step-down, focus, dates |
| Frontend guide storage | 2 | Per-user keys, storage failure |
| Frontend practice engine | 6 | States, hold, release, streak, suggestion |
| **Total** | **67** | **29 backend + 38 frontend** |

All 67 tests pass. Frontend tests use fixed random draws and injected `now` values, so schedule and date assertions are deterministic. The test suite does not include DOM/component tests, a browser-driven end-to-end suite, or camera simulation.

### C. Static Build and Runtime Checks

ESLint passes with the React hooks and react-refresh rules enabled. The production build transforms 506 modules and emits a 446.38 kB main JavaScript bundle (139.38 kB gzip), a 153.90 kB lazy MediaPipe vision bundle (45.46 kB gzip), and a 45.14 kB stylesheet (7.62 kB gzip). Splitting the vision runtime keeps the initial application bundle smaller and defers the cost of hand tracking until a camera session begins.

A local smoke check verified that registration, verification, login, session save, practice save, and per-user isolation work through the Vite proxy. The development origin configuration was also exercised: requests from the supported Vite ports reach validation, a foreign origin is rejected, and production defaults to the configured application URL. These checks are implementation evidence, not a substitute for deployment testing.

### D. Scope of Verification

The evaluation is limited to automated logic and API tests, static analysis, a production build, and targeted local smoke checks. No patients or healthy volunteers were enrolled, and no usability, motion-capture, or clinical outcome measure was administered. Camera-dependent behavior was verified by inspection and manual browser use, not an automated visual test. This boundary is stated so the engineering results are not mistaken for clinical evidence.

## VI. Discussion

### A. Strengths

The primary strength is accessibility: a browser, webcam, and account suffice, with no headset, depth sensor, glove, or installed application. Local perception keeps raw video on the device; only derived exercise data, account identifiers, and calibration summaries are persisted.

The dual-mode design is a second strength. The game supplies externally paced repetition and switching, while practice supplies self-paced hold maintenance. Per-gesture statistics make these demands visible and let the plan focus on a weak grip. The rule-based forecast and difficulty logic are explainable: a user can see the recent average, trend, focus grip, and reason for a change.

The implementation separates concerns in a way that supports verification. Pure modules make timing, scoring, and adaptation testable without a browser; backend integration tests use the real application and a temporary database. Security is layered through hashing, cookie protections, origin checks, rate limits, validation, and per-user scoping. The architecture fits one server and leaves seams for a database, cache, or mail upgrade.

### B. Clinical and Design Implications

Grip Restore is an adjunct to clinician-prescribed therapy. The grips are coarse and the game does not measure joint angles, muscle activation, or movement quality; a clinician must confirm that the grips and dosage suit the person, especially after stroke or with pain, spasticity, or instability. The game pauses when tracking is unavailable rather than forcing continuation, but a home product still needs guidance on stopping, seeking help, and avoiding overuse.

The plan may support self-management but could create false confidence if a forecast is read as a clinical prediction. The interface labels it as guidance tied to recent sessions. Future work should test whether users understand this distinction and whether progression matches therapist judgment.

### C. Limitations

The main limitation is the absence of a clinical or usability study. We cannot claim improvements in hand function, adherence, or quality of life, nor that the classifier is accurate enough for assessment. MediaPipe tracking is monocular and can degrade with poor lighting, occlusion, unusual anatomy, or extreme angles [10], [11]. The classifier uses fixed thresholds and a small gesture set and does not estimate force, range of motion, tremor, or compensatory movement.

Calibration data is stored but unused. The game does not adapt within a session, and difficulty levels are discrete. The forecast is unvalidated against therapist ratings or outcomes. Sessions saved before the per-gesture schema change lack grip-level data. Navigating away does not save partial progress, and refreshing the game route loses configuration. Rate-limit and lockout counters are in memory, email is console-only until SMTP is configured, and `node:sqlite` remains experimental.

Accessibility is partial: the interface has semantic landmarks, labels, progress semantics, visible focus, and reduced motion, but no screen-reader or automated audit. There are no DOM/component or browser end-to-end tests. The system has not had a formal privacy, security, or regulatory review and is not a medical device.

### D. Future Work

The next step is a feasibility and usability study with intended users and clinicians, covering task completion, workload, tracking failures, and forecast comprehension. A mixed-methods study could then compare adherence and exercise dose against a standard home program. Technical work should include calibration-driven thresholds, within-session adaptation, more grips and range-of-motion tasks, and form-quality feedback.

Deployment hardening would replace in-memory rate limits with a shared store, move to a managed database, add an email queue, and introduce monitoring. A clinician-facing view could summarize per-gesture trends with consent and access control. Accessibility should be evaluated with screen-reader users and users with limited dexterity. A privacy review, retention policy, and security assessment are prerequisites for real patient data.

## VII. Conclusion

Grip Restore demonstrates a low-cost, browser-based approach to home hand rehabilitation that combines webcam hand tracking, two complementary exercise modes, explainable progression, and secure longitudinal persistence. The system runs without specialized hardware, keeps video processing local, and separates pure exercise logic from the interface so that timing, scoring, and adaptation can be tested deterministically. Automated verification currently comprises 29 backend and 38 frontend tests, a clean lint and production build, and targeted local smoke checks. These results establish engineering feasibility, not clinical effectiveness. The next phase is a structured usability and feasibility evaluation, followed by deployment hardening and, if warranted, a controlled clinical study.

## References

[1] V. L. Feigin et al., “Global, regional, and national burden of stroke and its risk factors, 1990–2021: A systematic analysis for the Global Burden of Disease Study 2021,” *Lancet Neurol.*, vol. 23, no. 10, pp. 973–1003, Oct. 2024, doi: 10.1016/S1474-4422(24)00369-7.

[2] K. E. Laver, Z. Adey-Wakeling, M. Crotty, N. A. Lannin, S. George, and C. Sherrington, “Telerehabilitation services for stroke,” *Cochrane Database Syst. Rev.*, vol. 2020, no. 1, Art. no. CD010255, Jan. 2020, doi: 10.1002/14651858.CD010255.pub3.

[3] N. Østerås et al., “Exercise for hand osteoarthritis,” *Cochrane Database Syst. Rev.*, vol. 2017, no. 1, Art. no. CD010388, Jan. 2017, doi: 10.1002/14651858.CD010388.pub2.

[4] S. Lang, C. McLelland, D. MacDonald, and D. F. Hamilton, “Do digital interventions increase adherence to home exercise rehabilitation? A systematic review of randomised controlled trials,” *Arch. Physiother.*, vol. 12, no. 1, Art. no. 24, Oct. 2022, doi: 10.1186/s40945-022-00148-z.

[5] J. P. Proença, C. Quaresma, and P. Vieira, “Serious games for upper limb rehabilitation: A systematic review,” *Disabil. Rehabil.: Assist. Technol.*, vol. 13, no. 1, pp. 95–100, Jan. 2018, doi: 10.1080/17483107.2017.1290702.

[6] I. Doumas, G. Everard, S. Dehem, and T. Lejeune, “Serious games for upper limb rehabilitation after stroke: A meta-analysis,” *J. NeuroEng. Rehabil.*, vol. 18, no. 1, Art. no. 100, Jun. 2021, doi: 10.1186/s12984-021-00889-1.

[7] L. Wang, J.-L. Chen, A. M. K. Wong, K.-C. Liang, and K. C. Tseng, “Game-based virtual reality system for upper limb rehabilitation after stroke in a clinical environment: Systematic review and meta-analysis,” *Games Health J.*, vol. 11, no. 5, pp. 277–297, Oct. 2022, doi: 10.1089/g4h.2022.0086.

[8] T. Szturm, Z. Imran, S. Pooyania, A. Kanitkar, and B. Mahana, “Evaluation of a game based tele rehabilitation platform for in-home therapy of hand-arm function post stroke: Feasibility study,” *PM&R*, vol. 13, no. 1, pp. 45–54, Jan. 2021, doi: 10.1002/pmrj.12354.

[9] D. Lockery, J. F. Peters, S. Ramanna, B. L. Shay, and T. Szturm, “Store-and-feedforward adaptive gaming system for hand-finger motion tracking in telerehabilitation,” *IEEE Trans. Inf. Technol. Biomed.*, vol. 15, no. 3, pp. 467–473, May 2011, doi: 10.1109/TITB.2011.2125976.

[10] F. Zhang, V. Bazarevsky, A. Vakunov, A. Tkachenka, G. Sung, C.-L. Chang, and M. Grundmann, “MediaPipe Hands: On-device real-time hand tracking,” in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. Workshops (CVPRW)*, 2020, pp. 1–5, arXiv:2006.10214.

[11] G. Amprimo, G. Masi, G. Pettiti, P. Olmo, L. Priano, and C. Ferraris, “Hand tracking for clinical applications: Validation of the Google MediaPipe Hand (GMH) and the depth-enhanced GMH-D frameworks,” *Biomed. Signal Process. Control*, vol. 96, Art. no. 106508, Oct. 2024, doi: 10.1016/j.bspc.2024.106508.

[12] A. Bouatrous, A. Meziane, N. Zenati, and C. Hamitouche, “A new adaptive VR-based exergame for hand rehabilitation after stroke,” *Multimedia Systems*, vol. 29, no. 6, pp. 3385–3402, 2023, doi: 10.1007/s00530-023-01180-0.

[13] J. Chen, S. Zhao, H. Meng, X. Cheng, and W. Tan, “An interactive game for rehabilitation based on real-time hand gesture recognition,” *Front. Physiol.*, vol. 13, Art. no. 1028907, Oct. 2022, doi: 10.3389/fphys.2022.1028907.
