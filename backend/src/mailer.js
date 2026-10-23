import crypto from 'node:crypto'

let cachedTransport = null

function smtpConfigured(config) {
  return Boolean(config.smtp.host)
}

async function getTransport(config) {
  if (!smtpConfigured(config)) return null
  if (cachedTransport) return cachedTransport
  const { default: nodemailer } = await import('nodemailer')
  cachedTransport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  })
  return cachedTransport
}

/**
 * Sends a message via SMTP when configured; otherwise logs it for local
 * development. Returns true when handed to SMTP.
 */
export async function sendMail(config, { to, subject, text }) {
  const transport = await getTransport(config)
  if (!transport) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`)
    return false
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, text })
  return true
}

export function verificationUrl(config, token) {
  return `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`
}

export function resetUrl(config, token) {
  return `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`
}

export function mailId() {
  return crypto.randomUUID()
}
