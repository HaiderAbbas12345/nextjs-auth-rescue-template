'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { registerAction, googleSignInAction, type ActionResult } from '@/lib/auth-actions';

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    registerAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push('/login?registered=1');
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="Minimum 8 characters."
        />
        <Field label="Name (optional)" name="name" type="text" autoComplete="name" />

        {state && !state.ok && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <form action={googleSignInAction}>
        <button
          type="submit"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
};

function Field({ label, name, type, required, minLength, autoComplete, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {hint && <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </label>
  );
}
