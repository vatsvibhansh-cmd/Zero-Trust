'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DEVICE_1,
  DEVICE_2,
  type Device,
  type SharedDocument,
  type StudentSession,
  formatDateTime,
  getStudentSession,
  logViewingExpired,
  openDocument,
} from '@/lib/portal-store';

type ViewState =
  | { kind: 'checking' }
  | { kind: 'allowed'; doc: SharedDocument; device: Device }
  | { kind: 'denied'; reason: string }
  | { kind: 'expired'; doc: SharedDocument };

function LockIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Watermark({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="watermark absolute"
          style={{
            top: `${3 + Math.floor(i / 3) * 24}%`,
            left: `${-10 + (i % 3) * 34}%`,
            transform: 'rotate(-22deg)',
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

export default function ViewerPage() {
  const params = useParams<{ token: string }>();
  const token = (params?.token as string) || '';
  const router = useRouter();

  const [session, setSession] = useState<StudentSession | null>(null);
  const [device, setDevice] = useState<'device1' | 'device2'>('device1');
  const [view, setView] = useState<ViewState>({ kind: 'checking' });
  const [timeLeft, setTimeLeft] = useState(60);
  const attemptedRef = useRef(false);
  const expiryLoggedRef = useRef(false);

  const attempt = useCallback(
    (deviceId: 'device1' | 'device2') => {
      const activeSession = getStudentSession();
      if (!activeSession) {
        router.replace(`/student?token=${encodeURIComponent(token)}`);
        return;
      }
      const activeDevice = deviceId === 'device2' ? DEVICE_2 : DEVICE_1;
      setSession(activeSession);
      setDevice(deviceId);

      const result = openDocument(token, activeSession, activeDevice);
      if (result.allowed && result.doc) {
        expiryLoggedRef.current = false;
        setView({ kind: 'allowed', doc: result.doc, device: activeDevice });
      } else {
        setView({ kind: 'denied', reason: result.reason ?? 'Details Mismatch' });
      }
    },
    [router, token]
  );

  useEffect(() => {
    if (!token) return;
    const activeSession = getStudentSession();
    if (!activeSession) {
      router.replace(`/student?token=${encodeURIComponent(token)}`);
      return;
    }
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    attempt('device1');
  }, [attempt, router, token]);

  // Countdown for an allowed view
  useEffect(() => {
    if (view.kind !== 'allowed') return;
    const expiresAt = view.doc.viewExpiresAt;
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !expiryLoggedRef.current) {
        expiryLoggedRef.current = true;
        const activeSession = getStudentSession();
        if (activeSession) logViewingExpired(view.doc, activeSession, view.device);
        setView({ kind: 'expired', doc: view.doc });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [view]);

  if (view.kind === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm font-medium text-slate-500">Running zero-trust checks…</p>
      </div>
    );
  }

  const deviceButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`btn btn-sm ${device === 'device1' ? 'btn-blue' : 'btn-outline'}`}
        onClick={() => attempt('device1')}
      >
        Device 1 — My Phone — {DEVICE_1.ip}
      </button>
      <button
        type="button"
        className={`btn btn-sm ${device === 'device2' ? 'btn-red' : 'btn-outline'}`}
        onClick={() => attempt('device2')}
      >
        Device 2 — Friend&apos;s Phone — {DEVICE_2.ip}
      </button>
    </div>
  );

  if (view.kind === 'denied') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="card overflow-hidden">
            <div className="border-b border-red-200 bg-red-50 px-6 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <LockIcon className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-red-700">ACCESS DENIED</h1>
              <p className="mt-1 text-sm font-semibold text-red-600">{view.reason}</p>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-slate-600">
                This attempt has been recorded in the Admin Audit Log with the visitor IP, device and reason.
              </p>
              <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
                <div className="flex justify-between"><span>Token</span><span className="font-mono font-semibold text-slate-700">{token}</span></div>
                <div className="mt-1 flex justify-between"><span>Checked from</span><span className="font-mono font-semibold text-slate-700">{device === 'device2' ? DEVICE_2.ip : DEVICE_1.ip}</span></div>
              </div>
              {deviceButtons}
              <Link href="/student" className="btn btn-blue mt-4 w-full">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view.kind === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Link Expired - Token Destroyed</h1>
          <p className="mt-2 text-sm text-slate-500">
            The 60-second viewing window has closed and this link can never be reopened.
          </p>
          <Link href="/student" className="btn btn-blue mt-5 w-full">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { doc, device: activeDevice } = view;
  const watermark = `${doc.studentName} - ${doc.rollNo} - ${doc.contact}`;
  const danger = timeLeft <= 10;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Secure Document Viewer</p>
            <h1 className="text-lg font-bold text-slate-900">{doc.documentType}</h1>
          </div>
          <Link href="/student" className="btn btn-outline btn-sm w-fit">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <div className="card px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Demo device simulation</p>
          {deviceButtons}
        </div>

        <div className={`card flex flex-col items-center gap-1 px-6 py-5 ${danger ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Time remaining</p>
          <p className={`font-mono text-4xl font-bold tabular-nums ${danger ? 'text-red-600' : 'text-blue-700'}`}>
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
          </p>
          <p className={`text-sm font-semibold ${danger ? 'text-red-600' : 'text-blue-700'}`}>{timeLeft}s remaining…</p>
          <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/80">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${danger ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(100, (timeLeft / 60) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Authorized: <span className="font-semibold text-slate-700">{session?.name}</span> · Locked IP:{' '}
            <span className="font-mono">{activeDevice.ip}</span> · Till {formatDateTime(doc.endTime)}
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-red-600">
            Screenshot / Forward is Blocked
          </span>
        </div>

        <div className="card relative overflow-hidden p-6 sm:p-8">
          <Watermark text={watermark} />
          <div className="relative z-20 select-none font-mono text-xs leading-relaxed text-slate-700 sm:text-sm">
            <div className="border-b-2 border-slate-200 pb-3 text-center">
              <p className="text-sm font-bold tracking-wide text-slate-900">GEETA UNIVERSITY</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Official Student Document</p>
            </div>
            <p className="mt-5 text-center text-base font-bold uppercase tracking-wider text-slate-800">
              {doc.documentType}
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex gap-3"><span className="w-28 text-slate-500">Student Name</span><span className="font-semibold text-slate-800">: {doc.studentName}</span></div>
              <div className="flex gap-3"><span className="w-28 text-slate-500">Roll Number</span><span className="font-semibold text-slate-800">: {doc.rollNo}</span></div>
              <div className="flex gap-3"><span className="w-28 text-slate-500">Contact</span><span className="font-semibold text-slate-800">: {doc.contact}</span></div>
              <div className="flex gap-3"><span className="w-28 text-slate-500">File</span><span className="font-semibold text-slate-800">: {doc.fileName}</span></div>
              <div className="flex gap-3"><span className="w-28 text-slate-500">Valid Till</span><span className="font-semibold text-slate-800">: {formatDateTime(doc.endTime)}</span></div>
              <div className="flex gap-3"><span className="w-28 text-slate-500">Issued By</span><span className="font-semibold text-slate-800">: Central Examination Cell</span></div>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
              <p>This document is protected by the Geeta University Zero-Trust grid. It is watermarked to the
                authorized student and bound to a single device for 60 seconds.</p>
              <p className="mt-2">Ref: {doc.token} · Generated {formatDateTime(doc.createdAt)}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Screenshots and forwarding are traceable. The link self-destructs after 60 seconds.
        </p>
      </main>
    </div>
  );
}
