import Link from 'next/link';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create account</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Start with email and password. OAuth providers coming next.
        </p>
      </div>

      <RegisterForm />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
