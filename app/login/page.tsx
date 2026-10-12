'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to sign in.');
      }
      const next = searchParams.get('next');
      const allowedNext =
        data.user.role === 'client'
          ? next && next.startsWith('/client')
          : next && !next.startsWith('/client') && next !== '/';
      router.replace(allowedNext && next ? next : data.redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#FAF7F2]">
      <aside className="hidden lg:flex flex-col justify-between bg-black text-white p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg grid place-items-center">
              <div className="grid grid-cols-2 gap-0.5">
                <span className="w-2.5 h-2.5 bg-black" />
                <span className="w-2.5 h-2.5 bg-black" />
                <span className="w-2.5 h-2.5 bg-black" />
                <span className="w-2.5 h-2.5 bg-black" />
              </div>
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Offerings Pro</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">ShopHub</div>
            </div>
          </div>
          <h1 className="mt-16 text-4xl font-extrabold tracking-tight leading-tight">
            Sign in with your account
            <span className="block text-gray-400 font-semibold mt-3 text-xl">
              We’ll open the workspace that matches your role.
            </span>
          </h1>
        </div>
        <p className="text-sm text-gray-400 max-w-md">
          Admin and enterprise accounts open Master Catalog. Client accounts open the Hub portal.
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-3xl border border-black/5 shadow-sm p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Sign in</p>
          <h2 className="mt-2 text-2xl font-extrabold text-gray-950">Welcome back</h2>
          <p className="mt-1 text-sm text-gray-500">Enter your username or email and password to continue.</p>

          <label className="block mt-6 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Username
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username or email"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 caret-gray-900 placeholder:text-gray-400"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>

          <label className="block mt-4 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Password
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 pr-11 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 caret-gray-900 placeholder:text-gray-400"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((open) => !open)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-400 hover:text-gray-800"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 3l18 18M10.5 10.7a2.5 2.5 0 003.8 3.2M9.9 5.2A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.7 11.7 0 01-4.2 5.1M6.1 6.6A11.8 11.8 0 001 12.5C2.7 16.9 7 20 12 20c1.7 0 3.3-.4 4.7-1"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M2 12.5C3.7 8.1 8 5 13 5s9.3 3.1 11 7.5C22.3 16.9 18 20 13 20s-9.3-3.1-11-7.5z"
                    />
                    <circle cx="13" cy="12.5" r="2.5" strokeWidth={1.8} />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-black text-white text-sm font-semibold py-3 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2]" />}>
      <LoginForm />
    </Suspense>
  );
}
