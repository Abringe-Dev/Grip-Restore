const TASKS_VISION_VERSION = '1.1.0'

export const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const LOAD_TIMEOUT_MS = 15000

function withTimeout(promise, ms, message, onLate) {
  let timedOut = false
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      reject(new Error(message))
    }, ms)
  })
  promise.then(
    (value) => {
      if (timedOut && onLate) {
        try {
          onLate(value)
        } catch {
          /* release is best-effort */
        }
      }
    },
    () => {},
  )
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout])
}

function looksLikeDelegateFailure(err) {
  const msg = err && err.message ? err.message : ''
  return /webgl|gpu|delegate/i.test(msg)
}

function closeLandmarker(landmarker) {
  try {
    landmarker.close()
  } catch {
    /* already released */
  }
}

async function createWithDelegate(vision, HandLandmarker, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
  })
}

/**
 * Lazily loads the MediaPipe runtime (dynamic import keeps it out of the
 * initial bundle) and creates a VIDEO-mode HandLandmarker. Tries the GPU
 * delegate first, falls back to CPU on machines without WebGL2.
 * Returns { landmarker, HandLandmarker } so callers can also use statics
 * like HAND_CONNECTIONS without a separate import.
 */
export async function createHandLandmarker() {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(WASM_URL),
    LOAD_TIMEOUT_MS,
    'Hand-tracking runtime took too long to load. Check your connection and try again.',
  )
  try {
    const landmarker = await withTimeout(
      createWithDelegate(vision, HandLandmarker, 'GPU'),
      LOAD_TIMEOUT_MS,
      'Hand-tracking model took too long to load. Check your connection and try again.',
      closeLandmarker,
    )
    return { landmarker, HandLandmarker }
  } catch (err) {
    if (!looksLikeDelegateFailure(err)) throw err
    const landmarker = await withTimeout(
      createWithDelegate(vision, HandLandmarker, 'CPU'),
      LOAD_TIMEOUT_MS,
      'Hand-tracking model took too long to load. Check your connection and try again.',
      closeLandmarker,
    )
    return { landmarker, HandLandmarker }
  }
}

/**
 * Runs one VIDEO-mode detection. Returns the HandLandmarkerResult, or null
 * when the frame should be skipped (video not ready, unchanged frame, or a
 * non-monotonic timestamp which detectForVideo would reject).
 * `cursor` is a mutable { lastVideoTime, lastTimestamp } holder.
 */
export function detectHands(landmarker, video, cursor) {
  if (!landmarker || !video) return null
  if (video.readyState < 2) return null
  if (video.currentTime === cursor.lastVideoTime) return null
  const timestamp = performance.now()
  if (timestamp <= cursor.lastTimestamp) return null
  cursor.lastVideoTime = video.currentTime
  cursor.lastTimestamp = timestamp
  return landmarker.detectForVideo(video, timestamp)
}