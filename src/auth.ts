import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import authConfig from '@/auth.config';
import { getDb } from '@/lib/db';

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const db = await getDb();
        const users = db.collection('users');
        const user = await users.findOne({ email });

        if (!user?.passwordHash) return null;

        // Silent lockout: return null (caller sees "Invalid credentials") to avoid
        // exposing lockout state to attackers — prevents account-status enumeration.
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          const failedAttempts = (user.failedAttempts ?? 0) + 1;
          const update: Record<string, unknown> = { failedAttempts };
          if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            update.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
            update.failedAttempts = 0;
          }
          await users.updateOne({ _id: user._id }, { $set: update });
          return null;
        }

        if ((user.failedAttempts ?? 0) > 0 || user.lockedUntil) {
          await users.updateOne(
            { _id: user._id },
            { $set: { failedAttempts: 0, lockedUntil: null } },
          );
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const db = await getDb();
        const users = db.collection('users');
        await users.updateOne(
          { email: user.email.toLowerCase() },
          {
            $setOnInsert: {
              email: user.email.toLowerCase(),
              name: user.name ?? null,
              image: user.image ?? null,
              provider: 'google',
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
    },
  },
});
