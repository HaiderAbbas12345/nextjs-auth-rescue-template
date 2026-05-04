import Link from 'next/link';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
      <div className="max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Auth Rescue Template
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Production-grade Auth.js v5 + MongoDB + Next.js App Router. Documents the auth
            mistakes I see in stalled MERN/Next.js codebases — and the fixes.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
