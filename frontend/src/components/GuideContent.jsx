import { GESTURES } from '../game/session'

const descriptions = {
  pinch: 'Bring your thumb and index finger together, like holding a small berry.',
  fist: 'Close your hand gently — keep your wrist relaxed.',
  palm: 'Open your hand and spread all five fingers wide.',
}

export default function GuideContent({ compact = false }) {
  return (
    <div className={`guide-content${compact ? ' guide-content--compact' : ''}`}>
      <section className="guide-section">
        <h2 className="guide-section-title">1. Get camera-ready</h2>
        <p>
          Grip Restore uses your webcam to recognise hand shapes. Allow camera
          access when your browser asks, and keep your hand in frame with your
          palm facing the camera.
        </p>
        <ul className="guide-list">
          <li>Sit comfortably with your hand about an arm&rsquo;s length from the screen.</li>
          <li>Use even lighting and avoid covering the camera.</li>
          <li>The preview is mirrored, so movement feels natural.</li>
        </ul>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">2. Learn the three grips</h2>
        <div className="guide-gestures">
          {GESTURES.map((gesture) => (
            <div key={gesture.key} className="guide-gesture" style={{ '--gesture-color': gesture.color }}>
              <span className="guide-gesture-emoji" aria-hidden="true">{gesture.emoji}</span>
              <span className="guide-gesture-name">{gesture.label}</span>
              <span className="guide-gesture-desc">{descriptions[gesture.key]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">3. Complete a play session</h2>
        <p>
          Pick 5 or 10 minutes and a difficulty. Calibration asks you to hold each
          grip for two seconds so the app can see your hand — you can skip it if
          needed.
        </p>
        <p>
          During play, notes fall in three lanes. Form the matching gesture as a
          note crosses the hit line. A hit lands inside the timing window; a miss
          happens after it. Accuracy is hits divided by total attempts, and it
          helps set your next difficulty.
        </p>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">4. Practise one grip at a time</h2>
        <p>
          Practice Mode lets you focus on Pinch, Fist, or Open Palm. Hold the
          chosen grip for two seconds to score a success. Releasing early or
          changing grip ends the attempt.
        </p>
        <p>
          Three successes in a row suggest a play session. Your practice
          accuracy and streaks are saved to your account.
        </p>
      </section>

      <section className="guide-section">
        <h2 className="guide-section-title">5. Follow your weekly plan</h2>
        <p>
          The week plan forecasts your next-session accuracy from your last five
          sessions and looks at each grip over its last three sessions. Grips
          below 75% with at least three attempts get extra focus.
        </p>
        <p>
          You&rsquo;ll see two to four sessions on alternating days, with the
          reason behind each choice. Start a planned session or jump straight
          into practising its focus grip.
        </p>
      </section>

      <section className="guide-section guide-section--safety">
        <h2 className="guide-section-title">6. Keep it comfortable</h2>
        <p>
          Move slowly and stop if you feel pain, tingling, or soreness. Grip
          Restore is an exercise aid, not medical advice — check with a
          clinician if symptoms continue.
        </p>
      </section>
    </div>
  )
}
