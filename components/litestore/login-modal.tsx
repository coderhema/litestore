'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Lock } from 'iconoir-react';
import { saveOrVerifyDemoAccount, saveSession } from '@/lib/litestore-auth';

export function LoginModal({
  open,
  initialEmail = '',
  onClose,
  onSuccess
}: {
  open: boolean;
  initialEmail?: string;
  onClose?: () => void;
  onSuccess?: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setPassword('');
      setError('');
    }
  }, [initialEmail, open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) onClose?.();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password.trim()) {
      setError('Enter your email and password to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const ok = await saveOrVerifyDemoAccount(trimmedEmail, password);
      if (!ok) {
        setError('That password does not match the saved demo login.');
        return;
      }

      saveSession(trimmedEmail);
      onSuccess?.(trimmedEmail);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0e0c16] p-5 text-white shadow-[0_28px_120px_rgba(0,0,0,0.55)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/50">
              <Lock className="h-3.5 w-3.5" /> Demo login
            </div>
            <h2 className="mt-4 text-3xl font-[family-name:var(--font-display)] text-white">Get started</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              For the hackathon demo, passwords are stored locally in IndexedDB and your session stays on this device.
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65 transition hover:bg-white/10"
            >
              Close
            </button>
          ) : null}
        </div>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm text-white/70">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/25"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/70">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/25"
              placeholder="Create or enter a password"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-medium text-zinc-950 transition hover:-translate-y-0.5 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Continue to create'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
