'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMessages } from '@/app/components/LocaleProvider';
import type { Messages } from '@/lib/messages';

// What to say below the heading: one of our messages, by key, so it
// follows a change of language; or the API's own error text.
type Message =
  | { key: keyof Pick<Messages['verify'], 'missingToken' | 'failed' | 'error' | 'successBody'> }
  | { text: string };

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useMessages();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<Message>({ key: 'failed' });

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage({ key: 'missingToken' });
      return;
    }

    // Call the verification API
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage({ key: 'successBody' });

          // Clear the banner dismissed flag since email is now verified
          localStorage.removeItem('verification-banner-dismissed');

          // Redirect to home page after 3 seconds with hard refresh
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error ? { text: data.error } : { key: 'failed' });
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage({ key: 'error' });
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const messageText = 'key' in message ? t.verify[message.key] : message.text;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              {t.verify.verifying}
            </h1>
            <p className="text-zinc-600">
              {t.verify.verifyingBody}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              {t.verify.successTitle}
            </h1>
            <p className="text-zinc-600 mb-6">
              {messageText}
            </p>
            <p className="text-sm text-zinc-500 mb-4">
              {t.verify.redirecting}
            </p>
            <Link
              href="/"
              className="inline-block bg-zinc-900 text-white px-6 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              {t.verify.homeNow}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              {t.verify.failed}
            </h1>
            <p className="text-zinc-600 mb-6">
              {messageText}
            </p>
            <div className="space-y-3">
              <Link
                href="/"
                className="block bg-zinc-900 text-white px-6 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                {t.verify.home}
              </Link>
              <Link
                href="/signup"
                className="block border border-zinc-300 text-zinc-700 px-6 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                {t.verify.signupAgain}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
