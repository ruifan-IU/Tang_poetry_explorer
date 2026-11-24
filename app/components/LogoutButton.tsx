'use client';

import { useRouter } from 'next/navigation';
import { useMessages } from './LocaleProvider';

/** Signs out, then goes home. Used by UserMenu and the hamburger panel. */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useMessages();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button onClick={handleLogout} className={className}>
      {t.nav.logout}
    </button>
  );
}
