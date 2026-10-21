'use client';

import { FormEvent, Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const backdropImages = [
  '/images/projects/living-dining-r0.jpg',
  '/images/projects/kitchen-r0.jpg',
  '/images/projects/master-bedroom-r0.jpg',
  '/images/projects/guest-bedroom-r0.jpg',
  '/images/products/velet_sofa.png',
  '/images/offerings/aero-suede-hero.jpg',
  '/images/offerings/thumb-room.jpg',
  '/images/offerings/thumb-suede.jpg',
  '/images/offerings/thumb-side.jpg',
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#0b211e] px-5 py-8 sm:px-8">
      {/* Horizontal Scrolling Background - Multiple Rows - LEFT TO RIGHT with LEFT TILT */}
      <div 
        className="absolute inset-0 flex flex-col justify-center overflow-hidden"
        style={{
          transform: 'rotate(-12deg) scale(1.5)',
          transformOrigin: 'center center'
        }}
        aria-hidden="true"
      >
        {/* Row 1 */}
        <div 
          className="flex flex-nowrap gap-4 mb-4"
          style={{
            animation: 'scrollLeftToRight 120s linear infinite',
            willChange: 'transform'
          }}
        >
          {backdropImages.map((image, index) => (
            <div 
              key={`row1-set1-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
          {backdropImages.map((image, index) => (
            <div 
              key={`row1-set2-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
          {backdropImages.map((image, index) => (
            <div 
              key={`row1-set3-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div 
          className="flex flex-nowrap gap-4 mb-4"
          style={{
            animation: 'scrollLeftToRight 120s linear infinite',
            animationDelay: '-40s',
            willChange: 'transform'
          }}
        >
          {backdropImages.map((image, index) => (
            <div 
              key={`row2-set1-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
          {backdropImages.map((image, index) => (
            <div 
              key={`row2-set2-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
          {backdropImages.map((image, index) => (
            <div 
              key={`row2-set3-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
        </div>

        {/* Row 3 */}
        <div 
          className="flex flex-nowrap gap-4"
          style={{
            animation: 'scrollLeftToRight 120s linear infinite',
            animationDelay: '-80s',
            willChange: 'transform'
          }}
        >
          {backdropImages.map((image, index) => (
            <div 
              key={`row3-set1-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
          {backdropImages.map((image, index) => (
            <div 
              key={`row3-set2-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
          {backdropImages.map((image, index) => (
            <div 
              key={`row3-set3-${index}`} 
              className="relative flex-shrink-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-xl"
              style={{ width: '280px', height: '280px' }}
            >
              <Image src={image} alt="" fill sizes="280px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        aria-hidden="true" 
      />

      <section className="relative z-10 w-full max-w-137">
        {/* Logo Section */}
        <div className="mb-5 flex items-center justify-center gap-3 text-white">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-white/20">
            <Image 
              src="/images/hub-logo.png" 
              alt="Home & Merry Logo" 
              fill 
              className="object-contain p-1" 
              priority
            />
          </div>
          <span className="text-[24px] font-extrabold tracking-tight">Home & Merry</span>
        </div>

        {/* Welcome Card */}
        <div className="mb-3 rounded-[28px] bg-white px-7 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:px-8 sm:py-7">
          <h1 className="mb-2 text-[30px] font-extrabold leading-[1.12] text-[#111b19] sm:text-[34px]">
            Your dream home starts here.
          </h1>
          <p className="text-[15px] leading-6 text-[#687875]">
            Log in to discover your saved styles, manage orders, and track deliveries.
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-[28px] border border-white/10 bg-[#030807]/95 px-6 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-md sm:px-7">
          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="email" className="sr-only">Email address or Username</label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address or Username"
              className="h-15 w-full rounded-full border border-[#31413d] bg-[#111a18] px-5 text-[15px] text-white outline-none transition placeholder:text-[#9ba7a4] focus:border-[#5bd1a2] focus:ring-2 focus:ring-[#5bd1a2]/20"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />

            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-15 w-full rounded-full border border-[#31413d] bg-[#111a18] px-5 pr-14 text-[15px] text-white outline-none transition placeholder:text-[#9ba7a4] focus:border-[#5bd1a2] focus:ring-2 focus:ring-[#5bd1a2]/20"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#a6b2ae] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#5bd1a2]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411M17.41 17.41 21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/60 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-14.25 w-full items-center justify-center rounded-full bg-[#55d0a0] text-[16px] font-bold text-[#05130f] transition hover:bg-[#70dfb3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
