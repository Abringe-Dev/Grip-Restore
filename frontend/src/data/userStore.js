const PROFILES_KEY = 'grip-restore-users-v1'

export function normalizeEmail(raw) {
  return String(raw ?? '').trim().toLowerCase()
}

export function emailPrefix(email) {
  const id = normalizeEmail(email)
  const at = id.indexOf('@')
  return at > 0 ? id.slice(0, at) : id
}

function readProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function writeProfiles(map) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(map))
  } catch {
    /* quota/blocked storage — profiles are best-effort */
  }
}

export function lookupProfile(email) {
  const id = normalizeEmail(email)
  if (!id) return null
  const found = readProfiles()[id]
  return found && typeof found === 'object' ? found : null
}

export function upsertProfile(email, name) {
  const id = normalizeEmail(email)
  if (!id) return null
  const all = readProfiles()
  const prev = all[id] && typeof all[id] === 'object' ? all[id] : null
  const cleanName = String(name ?? '').trim()
  const profile = {
    name: cleanName || (prev && prev.name) || '',
    email: id,
    createdAt: (prev && prev.createdAt) || new Date().toISOString(),
  }
  all[id] = profile
  writeProfiles(all)
  return profile
}