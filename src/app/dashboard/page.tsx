import { auth } from '@/auth';
import { logoutAction } from '@/lib/auth-actions';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Signed in as</h2>
          <p className="mt-1 text-base font-medium text-gray-900 dark:text-white">
            {session?.user?.email}
          </p>
          {session?.user?.id && (
            <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
              ID: {session.user.id}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Protected route</h2>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            This page is gated by the <code className="font-mono text-xs">/dashboard/layout.tsx</code>{' '}
            server-side <code className="font-mono text-xs">auth()</code> check. Hitting this URL
            without a valid session redirects to <code className="font-mono text-xs">/login</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
