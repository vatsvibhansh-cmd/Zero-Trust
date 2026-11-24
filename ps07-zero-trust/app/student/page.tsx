'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DEVICE_1,
  DEMO_OTP,
  type SharedDocument,
  type StudentRecord,
  type StudentSession,
  addAudit,
  clearStudentSession,
  docStatus,
  ensureSeed,
  findDocument,
  formatDateTime,
  getStudentSession,
  loadDocuments,
  loadStudents,
  setStudentSession,
} from '@/lib/portal-store';

function StatusPill({ doc }: { doc: SharedDocument }) {
  const status = docStatus(doc);
  const cls =
    status === 'Active'
      ? 'pill pill-active'
      : status === 'Revoked'
        ? 'pill pill-revoked'
        : status === 'Leak Attempt'
          ? 'pill pill-leak'
          : 'pill pill-expired';
  return <span className={cls}>{status}</span>;
}

export default function StudentPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<StudentSession | null>(null);
  const [tokenFromLink, setTokenFromLink] = useState<string | null>(null);
  const [docs, setDocs] = useState<SharedDocument[]>([]);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [pendingStudent, setPendingStudent] = useState<StudentRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    ensureSeed();
    setMounted(true);
    const token = new URLSearchParams(window.location.search).get('token');
    setTokenFromLink(token);
    const existing = getStudentSession();
    if (existing) {
      if (token) {
        router.replace(`/student/view/${token}`);
      } else {
        setSession(existing);
        setDocs(loadDocuments());
      }
    }
  }, [router]);

  useEffect(() => {
    if (!mounted || !session) return;
    const refresh = () => setDocs(loadDocuments());
    refresh();
    const interval = setInterval(refresh, 2000);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [mounted, session]);

  const tokenDoc = tokenFromLink ? findDocument(tokenFromLink) : null;

  const auditLoginFailure = (reason: string, attemptedName: string, roll: string) => {
    addAudit({
      visitorName: attemptedName || 'Unknown',
      rollNo: roll || '—',
      ip: DEVICE_1.ip,
      document: tokenDoc?.documentType ?? 'Student Login',
      device: DEVICE_1.short,
      result: 'DENIED',
      reason,
    });
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const students = loadStudents();
    const match = students.find(
      (s) =>
        s.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        s.contact.replace(/\D/g, '') === contact.replace(/\D/g, '') &&
        s.password === password
    );
    if (!match) {
      setError('Access Denied - Details Mismatch');
      auditLoginFailure('Details Mismatch', name, '—');
      return;
    }
    setPendingStudent(match);
    setOtp('');
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pendingStudent) return;
    if (otp.trim() !== DEMO_OTP) {
      setError('Access Denied - Details Mismatch');
      auditLoginFailure('OTP Wrong', pendingStudent.name, pendingStudent.rollNo);
      return;
    }
    const nextSession: StudentSession = {
      name: pendingStudent.name,
      rollNo: pendingStudent.rollNo,
      contact: pendingStudent.contact,
    };
    setStudentSession(nextSession);
    if (tokenFromLink) {
      router.push(`/student/view/${tokenFromLink}`);
      return;
    }
    setSession(nextSession);
    setDocs(loadDocuments());
    setStep('credentials');
  };

  const handleLogout = () => {
    clearStudentSession();
    setSession(null);
    setName('');
    setPassword('');
    setContact('');
    setOtp('');
    setStep('credentials');
  };

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Geeta University</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Secure Document Portal</h1>
        </div>

        <div className="card w-full max-w-md p-8">
          <h2 className="text-xl font-bold text-slate-900">Student Login</h2>
          <p className="mt-1 text-sm text-slate-500">
            {step === 'credentials'
              ? 'Enter your details to receive a one-time password.'
              : 'Enter the 6-digit OTP to continue.'}
          </p>

          {tokenFromLink && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800">
              Secure link detected:{' '}
              <span className="font-mono font-bold">{tokenFromLink}</span>
              <span className="block text-blue-700/80">
                {tokenDoc ? `${tokenDoc.documentType} — you will be taken straight to it after OTP.` : 'This link does not match any document.'}
              </span>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="student-name">Full Name</label>
                <input
                  id="student-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vibhansh Vats"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="student-password">Password</label>
                <input
                  id="student-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="student-contact">Contact Number</label>
                <input
                  id="student-contact"
                  className="input font-mono"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="9876543210"
                  inputMode="numeric"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-green w-full">
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs text-green-800">
                OTP sent to <span className="font-mono font-bold">{pendingStudent?.contact}</span>
              </div>
              <div>
                <label className="label" htmlFor="student-otp">One-Time Password</label>
                <input
                  id="student-otp"
                  className="input text-center font-mono text-lg font-bold tracking-[0.4em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Demo OTP: <span className="font-mono font-bold text-slate-800">123456</span>
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-green w-full">
                Verify OTP &amp; Login
              </button>
              <button
                type="button"
                className="btn btn-outline w-full"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                }}
              >
                Back
              </button>
            </form>
          )}

          <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Demo student: <span className="font-semibold text-slate-700">Vibhansh Vats</span> /{' '}
            <span className="font-mono font-semibold text-slate-700">student123</span> /{' '}
            <span className="font-mono font-semibold text-slate-700">9876543210</span>
          </p>
        </div>

        <Link href="/" className="mt-6 text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to home
        </Link>
      </div>
    );
  }

  const myDocs = docs
    .filter((d) => d.rollNo.trim().toUpperCase() === session.rollNo.trim().toUpperCase())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">S</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Student Portal</p>
                <h1 className="text-lg font-bold leading-tight text-slate-900">Welcome, {session.name}</h1>
              </div>
            </div>
            <button type="button" className="btn btn-outline btn-sm w-fit" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>Roll No: <span className="font-mono font-semibold text-slate-700">{session.rollNo}</span></span>
            <span>Contact: <span className="font-mono font-semibold text-slate-700">{session.contact}</span></span>
            <span>IP: <span className="font-mono font-semibold text-slate-700">{DEVICE_1.ip}</span></span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">My Documents</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {myDocs.length} available
          </span>
        </div>

        {myDocs.length === 0 ? (
          <div className="card mt-5 px-6 py-14 text-center">
            <p className="text-sm text-slate-500">No documents shared yet</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myDocs.map((doc) => (
              <div key={doc.token} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <path d="M14 3.5V8h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <StatusPill doc={doc} />
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">{doc.documentType}</h3>
                <p className="mt-0.5 truncate text-xs text-slate-400">{doc.fileName}</p>
                <dl className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between"><dt>Shared By</dt><dd className="font-semibold text-slate-700">Admin</dd></div>
                  <div className="flex justify-between"><dt>Valid Till</dt><dd className="font-semibold text-slate-700">{formatDateTime(doc.endTime)}</dd></div>
                </dl>
                <Link href={`/student/view/${doc.token}`} className="btn btn-blue mt-4 w-full">
                  View Document
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
