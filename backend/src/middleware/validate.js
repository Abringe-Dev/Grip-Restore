export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      const issue = result.error.issues[0]
      res.status(400).json({ error: issue?.message || 'Invalid request.' })
      return
    }
    req.valid = result.data
    next()
  }
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}
