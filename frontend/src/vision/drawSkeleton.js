const CONNECTOR_COLOR = '#167D7F'
const DOT_COLOR = '#5B8DEF'
const DOT_STROKE = '#FFFFFF'

/**
 * Draws a hand skeleton onto a 2D canvas context. Landmarks are normalized
 * (0-1) over the full camera frame; the preview uses object-fit:cover, so
 * this maps through the same cover transform to keep the skeleton aligned
 * with the visible (possibly cropped) video.
 */
export function drawHandSkeleton(ctx, landmarks, frameW, frameH, viewW, viewH, connections = []) {
  if (!ctx || !landmarks?.length || frameW <= 0 || frameH <= 0) return

  const scale = Math.max(viewW / frameW, viewH / frameH)
  const drawnW = frameW * scale
  const drawnH = frameH * scale
  const offsetX = (drawnW - viewW) / 2
  const offsetY = (drawnH - viewH) / 2
  const toXY = (p) => ({ x: p.x * drawnW - offsetX, y: p.y * drawnH - offsetY })

  const lineWidth = Math.max(2, viewW / 220)
  const radius = Math.max(2.5, viewW / 150)

  ctx.lineWidth = lineWidth
  ctx.strokeStyle = CONNECTOR_COLOR
  ctx.lineCap = 'round'
  ctx.beginPath()
  connections.forEach(({ start, end }) => {
    const a = landmarks[start]
    const b = landmarks[end]
    if (!a || !b) return
    const pa = toXY(a)
    const pb = toXY(b)
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
  })
  ctx.stroke()

  ctx.fillStyle = DOT_COLOR
  ctx.strokeStyle = DOT_STROKE
  ctx.lineWidth = Math.max(1, lineWidth / 3)
  landmarks.forEach((p) => {
    const { x, y } = toXY(p)
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })
}