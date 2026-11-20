'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { safeRedirect } from '@/lib/safe-redirect';
import { useMessages } from '@/app/components/LocaleProvider';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const t = useMessages();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t.auth.loginFailed);
        setIsLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(t.auth.unexpectedError);
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        <div className='rounded-lg border border-zinc-200 bg-white p-8 shadow-sm'>
          <h1 className='mb-6 text-center text-3xl font-bold text-zinc-900'>
            {t.auth.loginTitle}
          </h1>

          {error && (
            <div className='mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600'>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label
                htmlFor='email'
                className='mb-1 block text-sm font-medium text-zinc-700'
              >
                {t.auth.email}
              </label>
              <input
                id='email'
                type='email'
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none'
                placeholder='your.email@example.com'
              />
            </div>

            <div>
              <label
                htmlFor='password'
                className='mb-1 block text-sm font-medium text-zinc-700'
              >
                {t.auth.password}
              </label>
              <input
                id='password'
                type='password'
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className='w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none'
                placeholder={t.auth.passwordPlaceholder}
              />
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50'
            >
              {isLoading ? t.auth.loggingIn : t.auth.loginTitle}
            </button>
          </form>

          <div className='mt-6 text-center text-sm text-zinc-600'>
            {t.auth.noAccount}{' '}
            <Link
              href='/signup'
              className='font-medium text-zinc-900 hover:underline'
            >
              {t.auth.signupNow}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
