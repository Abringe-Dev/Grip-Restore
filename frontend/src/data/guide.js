const GUIDE_KEY_PREFIX = 'grip-restore:guide-seen:'

export function guideSeenKey(userId) {
  return userId ? `${GUIDE_KEY_PREFIX}${userId}` : ''
}

export function hasSeenGuide(userId, storage = globalThis.localStorage) {
  const key = guideSeenKey(userId)
  if (!key || !storage) return false
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function markGuideSeen(userId, storage = globalThis.localStorage) {
  const key = guideSeenKey(userId)
  if (!key || !storage) return false
  try {
    storage.setItem(key, '1')
    return true
  } catch {
    return false
  }
}
