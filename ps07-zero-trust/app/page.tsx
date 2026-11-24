import Link from 'next/link';

function CapIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6.5 11.4v4.1c0 .8 2.5 2.5 5.5 2.5s5.5-1.7 5.5-2.5v-4.1" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M21.5 9.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <CapIcon className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Geeta University</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Secure Document Portal</h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">College Documents, Safely Shared</p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <Link
          href="/admin"
          className="card group flex flex-col p-6 transition-shadow hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5 19c.8-3.3 3.6-5 7-5s6.2 1.7 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-lg font-bold text-slate-900">I&apos;M ADMIN</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">Share documents securely</p>
          <span className="btn btn-blue mt-6 w-full">Open Admin Console</span>
        </Link>

        <Link
          href="/student"
          className="card group flex flex-col p-6 transition-shadow hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CapIcon className="h-6 w-6" />
            </span>
            <span className="text-lg font-bold text-slate-900">I&apos;M STUDENT</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">View my documents</p>
          <span className="btn btn-green mt-6 w-full">Open Student Portal</span>
        </Link>
      </div>
    </div>
  );
}
