import { z } from 'zod'

const email = z
  .string({ required_error: 'Please enter your email.' })
  .trim()
  .min(3, 'Please enter your email.')
  .max(254, 'That email is too long.')
  .email('That email doesn’t look right — try again.')

const password = z
  .string({ required_error: 'Please enter your password.' })
  .min(1, 'Please enter your password.')
  .max(128, 'Passwords must be 128 characters or fewer.')

const name = z
  .string({ required_error: 'We’d love to know what to call you.' })
  .trim()
  .min(1, 'We’d love to know what to call you.')
  .max(80, 'That name is too long.')

const token = z
  .string({ required_error: 'This link is missing its token.' })
  .min(20, 'This link is invalid or has expired.')
  .max(300, 'This link is invalid or has expired.')

export const registerSchema = z
  .object({ name, email, password })
  .strict('Unexpected fields in request.')

export const loginSchema = z
  .object({ email, password })
  .strict('Unexpected fields in request.')

export const emailSchema = z.object({ email }).strict('Unexpected fields in request.')

export const resetSchema = z
  .object({ token, password })
  .strict('Unexpected fields in request.')

const currentPassword = z
  .string({ required_error: 'Please enter your current password.' })
  .min(1, 'Please enter your current password.')
  .max(128, 'Passwords must be 128 characters or fewer.')

export const changePasswordSchema = z
  .object({ currentPassword, newPassword: password })
  .strict('Unexpected fields in request.')

export const verifySchema = z.object({ token }).strict('Unexpected fields in request.')

const difficulty = z.enum(['easy', 'medium', 'hard']).optional()

const gestureOutcome = z
  .object({
    hits: z.coerce.number().int().min(0).max(100000),
    misses: z.coerce.number().int().min(0).max(100000),
  })
  .strict('Unexpected fields in gesture stats.')

// Fixed gesture keys keep the client from inventing new lanes/stats.
const gestureStats = z
  .object({
    pinch: gestureOutcome.optional(),
    fist: gestureOutcome.optional(),
    palm: gestureOutcome.optional(),
  })
  .strict('Unexpected gesture in stats.')

export const practiceAttemptSchema = z
  .object({
    gesture: z.enum(['pinch', 'fist', 'palm']),
    success: z.boolean(),
  })
  .strict('Unexpected fields in request.')

export const createSessionSchema = z
  .object({
    durationMin: z.coerce.number().int().min(1).max(180),
    difficulty,
    hits: z.coerce.number().int().min(0).max(100000).nullish(),
    misses: z.coerce.number().int().min(0).max(100000).nullish(),
    accuracy: z.coerce.number().min(0).max(100).optional(),
    gesture: z.string().max(40).optional().default('Mixed'),
    gestures: z.array(z.string().max(40)).max(10).optional().default([]),
    gestureStats: gestureStats.optional().default({}),
    calibration: z.any().nullish(),
  })
  .strict('Unexpected fields in request.')
