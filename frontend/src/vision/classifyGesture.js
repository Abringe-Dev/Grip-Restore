// MediaPipe hand-landmark indices (fixed 21-point map).
const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_MCP = 9
const PINKY_MCP = 17
const TIPS = [8, 12, 16, 20]
const PIPS = [6, 10, 14, 18]

// All thresholds are fractions of hand size (dist(wrist, middle-MCP)),
// so they stay valid at any distance from the camera.
export const PINCH_ENTER_RATIO = 0.25
export const PINCH_EXIT_RATIO = 0.35
const THUMB_EXTENDED_RATIO = 0.8
const FIST_CURLED_MIN = 3
const EPSILON = 1e-6

// Every landmark index this classifier reads. Validated upfront so
// placeholder/partial points (e.g. {}) can never silently count as curled.
const NEEDED = [0, 4, 6, 8, 9, 10, 12, 14, 16, 17, 18, 20]

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

function round2(v) {
  return Math.round(v * 100) / 100
}

const NONE = { gesture: 'none', confidence: 0.5 }

/**
 * Stateless per-frame gesture classifier over 21 MediaPipe landmarks.
 * Priority: fist (checked first so a tight fist never misreads as pinch)
 *   → pinch → palm → none.
 * `pinchThresholdRatio` lets callers apply hysteresis (enter 0.25 / exit 0.35);
 * confidence is always measured against the ENTER threshold so latched and
 * unlatched frames stay comparable (a barely-held pinch reads ~0).
 *
 * Confidence contract (Feature 3 consumers: branch on gesture AND
 * confidence jointly — never gate on `confidence > X` alone. Confidence
 * means "pose strength", not "label probability": a valid latched pinch at
 * the release boundary reads pinch@0.00 while an absent hand reads
 * none@0.50. Compare confidences only within the same gesture; gate
 * progress on gesture identity + hold time, never on cross-gesture
 * confidence thresholds).
 */
export function classifyGesture(landmarks, pinchThresholdRatio = PINCH_ENTER_RATIO) {
  if (!landmarks || landmarks.length < 21) return { ...NONE }
  for (const i of NEEDED) {
    const p = landmarks[i]
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return { ...NONE }
  }
  const wrist = landmarks[WRIST]
  const middleMcp = landmarks[MIDDLE_MCP]
  if (!wrist || !middleMcp) return { ...NONE }
  const handSize = dist(wrist, middleMcp)
  if (!(handSize > EPSILON)) return { ...NONE }

  let extended = 0
  let curled = 0
  for (let f = 0; f < 4; f += 1) {
    const tip = landmarks[TIPS[f]]
    const pip = landmarks[PIPS[f]]
    if (!tip || !pip) return { ...NONE }
    if (dist(tip, wrist) > dist(pip, wrist)) extended += 1
    else curled += 1
  }

  const thumbTip = landmarks[THUMB_TIP]
  const pinkyMcp = landmarks[PINKY_MCP]
  const indexTip = landmarks[INDEX_TIP]
  if (!thumbTip || !pinkyMcp || !indexTip) return { ...NONE }
  const thumbExtended = dist(thumbTip, pinkyMcp) > THUMB_EXTENDED_RATIO * handSize

  if (curled >= FIST_CURLED_MIN) {
    return { gesture: 'fist', confidence: extended === 0 ? 1 : 0.75 }
  }

  const pinchDist = dist(thumbTip, indexTip)
  if (pinchDist < pinchThresholdRatio * handSize) {
    return { gesture: 'pinch', confidence: round2(clamp01(1 - pinchDist / (PINCH_ENTER_RATIO * handSize))) }
  }

  if (extended === 4 && thumbExtended) {
    return { gesture: 'palm', confidence: 1 }
  }

  return { ...NONE }
}