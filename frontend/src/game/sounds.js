// Web Audio beeps for the rhythm workout — no assets, no dependencies.
// Every public function is no-throw: browsers may start the AudioContext
// suspended (no gesture on a direct /game visit), so calls degrade silently.

let ctx = null
let master = null
let unlocked = false

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null
  return window.AudioContext || window.webkitAudioContext || null
}

function ensureContext() {
  if (ctx) return ctx
  const Ctor = getAudioContextCtor()
  if (!Ctor) return null
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)
  return ctx
}

function resumeContext() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

function unlock() {
  resumeContext()
}

function tone(freq, durationMs, delayMs = 0, peak = 0.25) {
  const c = ensureContext()
  if (!c || !master) return
  // Never schedule onto a suspended/closed context: queued tones would all
  // fire at once as a burst when the context later resumes. Stay silent until
  // a user gesture unlocks audio.
  if (c.state !== 'running') {
    resumeContext()
    return
  }
  const start = c.currentTime + delayMs / 1000
  const end = start + durationMs / 1000
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  osc.connect(gain)
  gain.connect(master)
  osc.start(start)
  osc.stop(end + 0.02)
}

// Idempotent: safe to call on every Gameplace mount / StrictMode remount.
export function initSounds() {
  try {
    if (!ensureContext()) return
    resumeContext()
    if (typeof window !== 'undefined' && !unlocked) {
      window.addEventListener('pointerdown', unlock, { once: true })
      window.addEventListener('keydown', unlock, { once: true })
      unlocked = true
    }
  } catch {
    /* audio unavailable — sounds stay silent */
  }
}

export function playPrompt() {
  try {
    tone(660, 90, 0, 0.22)
  } catch {
    /* silent */
  }
}

export function playSuccess() {
  try {
    tone(660, 90, 0, 0.22)
    tone(990, 90, 90, 0.22)
  } catch {
    /* silent */
  }
}

export function playMiss() {
  try {
    tone(220, 150, 0, 0.2)
    tone(165, 170, 110, 0.18)
  } catch {
    /* silent */
  }
}

export function playTick() {
  try {
    tone(440, 50, 0, 0.16)
  } catch {
    /* silent */
  }
}

export function playFinish() {
  try {
    const notes = [523, 659, 784, 1046]
    notes.forEach((freq, i) => tone(freq, 130, i * 130, 0.2))
  } catch {
    /* silent */
  }
}

// Exported for tests/future teardown; app code never calls this so the finish
// chime keeps ringing while /history animates in.
export function disposeSounds() {
  try {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    if (ctx) ctx.close().catch(() => {})
  } catch {
    /* already closed */
  }
  ctx = null
  master = null
  unlocked = false
}
