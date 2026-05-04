'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export type ActionResult = { ok: true } | { ok: false; error: string };

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
});

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return h.get('x-real-ip') ?? 'unknown';
}

function tooManyAttemptsMessage(resetAt: number): string {
  const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getClientIp();
  const limit = checkRateLimit(`register:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return { ok: false, error: tooManyAttemptsMessage(limit.resetAt) };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: 'Invalid input — check email format and password length (min 8).' };
  }

  const { email, password, name } = parsed.data;
  const db = await getDb();
  const users = db.collection('users');

  const existing = await users.findOne({ email });
  if (existing) {
    return { ok: false, error: 'An account with that email already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await users.insertOne({
    email,
    passwordHash,
    name: name ?? null,
    createdAt: new Date(),
    failedAttempts: 0,
  });

  return { ok: true };
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getClientIp();
  const limit = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) {
    return { ok: false, error: tooManyAttemptsMessage(limit.resetAt) };
  }

  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}

export async function googleSignInAction() {
  await signIn('google', { redirectTo: '/dashboard' });
}
