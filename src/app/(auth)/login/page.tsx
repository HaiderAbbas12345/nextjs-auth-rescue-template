import Link from 'next/link';
import { LoginForm } from './login-form';

type SearchParams = Promise<{ registered?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { registered } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Welcome back.
        </p>
      </div>

      {registered === '1' && (
        <p
          className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 p-3 text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          Account created — sign in to continue.
        </p>
      )}

      <LoginForm />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
