# nextjs-auth-rescue-template

> Production-grade **Auth.js v5 + MongoDB** starter for Next.js 15 — built around the auth mistakes I see in stalled MERN and Next.js codebases.

Most auth tutorials hand you a working login form and stop. This template is opinionated about the *real* failure modes — the bugs I get hired to fix. Each rescue pattern below is implemented in this codebase, with file references and the security tradeoff explained.

If you've inherited a stalled project with broken auth, this is a checklist for what to look at first.

---

## Stack

- **Next.js 15** — App Router, Server Actions, Edge runtime middleware
- **Auth.js v5** (`next-auth@beta`) — credentials + Google OAuth
- **MongoDB** — no adapter; manual user record management (deliberate, see Pattern 3)
- **TypeScript** strict — with module augmentation for `session.user.id`
- **bcryptjs** (cost factor 12) for credentials
- **zod** for boundary validation
- **Tailwind v4**

---

## Quick start

```bash
git clone https://github.com/HaiderAbbas12345/nextjs-auth-rescue-template.git
cd nextjs-auth-rescue-template
npm install
cp .env.local.example .env.local
npx auth secret              # generates AUTH_SECRET into .env.local
```

Edit `.env.local`:

```bash
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=auth_rescue
AUTH_SECRET=<auto-filled>
AUTH_URL=http://localhost:3000

AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
```

Then:

```bash
npm run dev
```

Visit http://localhost:3000.

### Google OAuth setup (~3 minutes)

1. https://console.cloud.google.com/apis/credentials
2. **Create credentials** → OAuth client ID → **Web application**
3. **Authorized redirect URI:** `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID + Secret into `.env.local`

---

## Rescue patterns

### 1. HMR-safe Mongo client &nbsp;`src/lib/db.ts`

**Bug I see in rescue jobs:** Dev environment exhausts the MongoDB Atlas connection pool after a few hours of work. Every save during HMR creates a new `MongoClient`; none get cleaned up.

**Fix:** Cache the connection promise on `globalThis` in development so HMR reuses it across module re-evaluation.

```ts
// src/lib/db.ts (excerpt)
if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
}
```

In production HMR doesn't run, so the simple path is used.

---

### 2. Edge runtime auth split &nbsp;`src/auth.config.ts` + `src/auth.ts`

**Bug I see:** `middleware.ts` imports `auth.ts` which imports MongoDB. Build fails: *"Module not found: 'bcryptjs' / 'mongodb' cannot run on Edge runtime."* This is one of the most common Auth.js v5 stuck-at-build-time errors in rescue jobs.

**Fix:** Two files, two scopes.

| File | Runtime | Contents |
|---|---|---|
| `auth.config.ts` | Edge-safe | Providers without DB calls (Google), callbacks that don't touch DB, `authorized` callback for middleware |
| `auth.ts` | Node-only | Extends `authConfig`, adds Credentials (uses bcrypt + Mongo), `events.signIn` that touches DB |
| `middleware.ts` | Edge | Imports `auth.config.ts` only |

The sign-in API route (`/api/auth/[...nextauth]/route.ts`) imports the full `auth.ts` because it runs on Node.

---

### 3. OAuth user persistence without the full adapter &nbsp;`src/auth.ts` `events.signIn`

**The choice:** the official `MongoDBAdapter` creates `users`, `accounts`, `sessions`, `verification_tokens` collections automatically. Cleaner — but locks you into the adapter's user shape and adds friction if you also use credentials.

**This template's approach:** no adapter. `events.signIn` upserts the OAuth user manually:

```ts
events: {
  async signIn({ user, account }) {
    if (account?.provider === 'google' && user.email) {
      await users.updateOne(
        { email: user.email.toLowerCase() },
        { $setOnInsert: { /* ... */ } },
        { upsert: true },
      );
    }
  },
}
```

**When to switch to the adapter:** if you add 3+ OAuth providers, the adapter saves repeated upsert logic. For 1–2, manual is more flexible and you control the shape.

---

### 4. Defense in depth: middleware **and** layout-level `auth()` check

**Bug I see:** Engineer adds middleware to protect `/dashboard`, deletes the server-side `auth()` check in the layout. One matcher misconfig later, the route is wide open and nobody notices for weeks.

**Fix:** keep both. Middleware does fast edge-level gating; the server-side check is the safety net.

```ts
// src/middleware.ts
export const config = { matcher: ['/dashboard/:path*'] };
```

```ts
// src/app/dashboard/layout.tsx
const session = await auth();
if (!session?.user) redirect('/login');
```

Either alone is a single point of failure. Together they're robust against matcher typos, layout misconfig, and middleware bypasses.

---

### 5. Rate limiting per IP &nbsp;`src/lib/rate-limit.ts`

In-memory implementation for clarity. **Production swaps to Upstash Ratelimit or Redis** — in-memory doesn't survive restarts and doesn't scale horizontally (noted at the top of the file).

Limits applied in `src/lib/auth-actions.ts`:

| Action | Limit | Window |
|---|---|---|
| Register | 5 attempts | 1 hour |
| Login | 10 attempts | 15 min |

The rate limit runs **before** schema validation so attackers can't cheaply probe input shape with thousands of malformed requests.

---

### 6. Account lockout — **silent**, to prevent enumeration

**The choice that matters:** when an account is locked, `authorize()` returns `null` so the user sees *"Invalid email or password"* — **not** *"Account locked, try again in 14 minutes."*

**Why:** the helpful error message is also a probe oracle. An attacker can enumerate which accounts have hit the lockout threshold without knowing the password.

```ts
// src/auth.ts authorize() (excerpt)
if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
  return null;
}
```

5 failed attempts on a credentials user → 15 min lockout → counter resets on successful login.

The UX cost is real (a legitimate user who knows the password sees a confusing error during the lockout window). For most rescue clients I've worked with, the security choice is correct — but it's worth raising explicitly with the client so they're not surprised.

---

## Patterns documented but not implemented

Each requires additional infrastructure (email provider, signed token expiration handling). Documented here for screening-call discussion; not built to keep this template focused.

### 7. Email verification

- New user can sign in but can't access protected routes until they verify
- Generate single-use, time-limited token (32 random bytes, base64url-encoded)
- Store **hash** of token in `verificationTokens` collection (not plaintext — assume DB compromise)
- Verification link includes token; server validates hash + expiration
- **Common bug I see:** token isn't invalidated after first use → replay attack

### 8. Password reset

- Same token mechanism as email verification
- **Tradeoff:** leak existence of email vs. always say *"if the email exists, we sent a link"* (the latter prevents enumeration)
- **Common bug I see:** session isn't rotated after password reset → if an attacker had the old session token, they keep access

---

## File map

```
src/
├── auth.config.ts                  # Edge-safe config (Pattern 2)
├── auth.ts                         # Full config: Credentials + lockout (Pattern 6) + events.signIn (Pattern 3)
├── middleware.ts                   # Edge route gating (Pattern 4 part 1)
├── lib/
│   ├── db.ts                       # HMR-safe Mongo client (Pattern 1)
│   ├── rate-limit.ts               # In-memory limiter (Pattern 5)
│   └── auth-actions.ts             # Server actions: register, login, logout, googleSignIn
├── types/
│   └── next-auth.d.ts              # Module augmentation for session.user.id
└── app/
    ├── page.tsx                    # Auth-aware landing
    ├── (auth)/
    │   ├── layout.tsx              # Centered card layout
    │   ├── login/{page,login-form}.tsx
    │   └── register/{page,register-form}.tsx
    ├── dashboard/
    │   ├── layout.tsx              # Server-side auth check (Pattern 4 part 2)
    │   └── page.tsx
    └── api/auth/[...nextauth]/route.ts
```

---

## Why this template is opinionated

This template solves the auth problems most of my rescue clients have. They're already on MongoDB, they don't have email-infrastructure budget, and they need auth that doesn't break. Adding the official adapter, switching databases, or wiring email lifts a small fix into a multi-week migration.

If your stack is different, swap the implementation — the rescue patterns above stay the same.

---

## License

MIT

---

Built by **[Haider Abbas](https://github.com/HaiderAbbas12345)** — Senior MERN + Next.js engineer. I rescue stalled JavaScript projects.
