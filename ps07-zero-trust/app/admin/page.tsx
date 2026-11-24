'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  type AuditEntry,
  type DocumentType,
  type SharedDocument,
  addAudit,
  createShare,
  docStatus,
  ensureSeed,
  formatAuditTime,
  isAdminLoggedIn,
  loadAudit,
  loadDocuments,
  loginAdmin,
  logoutAdmin,
  revokeDocument,
  timeTodayIso,
  toLocalTimeValue,
} from '@/lib/portal-store';

const DOC_TYPES: DocumentType[] = ['Admit Card', 'Marksheet', 'Fees Receipt', 'Certificate'];

const DEFAULT_FILE_NAMES: Record<DocumentType, string> = {
  'Admit Card': 'admit-card.pdf',
  Marksheet: 'marksheet.pdf',
  'Fees Receipt': 'fees-receipt.pdf',
  Certificate: 'certificate.pdf',
};

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
  return (
    <span className={cls}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'Active' ? 'bg-green-500' : status === 'Revoked' ? 'bg-red-500' : status === 'Leak Attempt' ? 'bg-amber-500' : 'bg-slate-400'}`} />
      {status}
    </span>
  );
}

function ResultPill({ result }: { result: AuditEntry['result'] }) {
  return (
    <span className={result === 'ALLOWED' ? 'pill pill-allowed' : 'pill pill-denied'}>{result}</span>
  );
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [loginError, setLoginError] = useState('');

  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const [studentName, setStudentName] = useState('Vibhansh Vats');
  const [rollNo, setRollNo] = useState('GEETA-CS-045');
  const [contact, setContact] = useState('9876543210');
  const [documentType, setDocumentType] = useState<DocumentType>('Admit Card');
  const [fileName, setFileName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formError, setFormError] = useState('');

  const [created, setCreated] = useState<SharedDocument | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isAdminLoggedIn());
    const now = new Date();
    setStartTime(toLocalTimeValue(new Date(now.getTime() - 5 * 60 * 1000)));
    setEndTime(toLocalTimeValue(new Date(now.getTime() + 55 * 60 * 1000)));
  }, []);

  useEffect(() => {
    if (!mounted || !loggedIn) return;
    ensureSeed();
    const refresh = () => {
      setDocs(loadDocuments());
      setAudit(loadAudit());
    };
    refresh();
    const interval = setInterval(refresh, 2000);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [mounted, loggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      loginAdmin();
      setLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid Admin Credentials');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setLoggedIn(false);
    setCreated(null);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const digits = contact.replace(/\D/g, '');
    if (!studentName.trim() || !rollNo.trim()) {
      setFormError('Please enter the student name and roll number.');
      return;
    }
    if (digits.length !== 10) {
      setFormError('Contact number must be a 10-digit mobile number.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Please set both a start time and an end time.');
      return;
    }
    const startIso = timeTodayIso(startTime);
    const endIso = timeTodayIso(endTime);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFormError('End time must be after the start time.');
      return;
    }

    const doc = createShare({
      studentName,
      rollNo,
      contact: digits,
      documentType,
      fileName: fileName || DEFAULT_FILE_NAMES[documentType],
      startTime: startIso,
      endTime: endIso,
    });
    addAudit({
      visitorName: 'Admin',
      rollNo: '—',
      ip: '—',
      document: doc.documentType,
      device: 'Admin Console',
      result: 'ALLOWED',
      reason: `Secure link ${doc.token} generated for ${doc.studentName}`,
    });
    setCreated(doc);
    setDocs(loadDocuments());
    setAudit(loadAudit());
  };

  const handleRevoke = (token: string) => {
    revokeDocument(token);
    setDocs(loadDocuments());
  };

  const link =
    created && typeof window !== 'undefined'
      ? `${window.location.origin}/doc/${created.token}`
      : created
        ? `/doc/${created.token}`
        : '';

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const area = document.createElement('textarea');
      area.value = link;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!created) return;
    const message = `Your ${created.documentType} from Geeta University: ${link} (valid for 60 seconds, single device, do not forward).`;
    window.open(`https://wa.me/91${created.contact}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Geeta University</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Secure Document Portal</h1>
        </div>
        <div className="card w-full max-w-md p-8">
          <h2 className="text-xl font-bold text-slate-900">Admin Login</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to share and revoke student documents.</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@geeta.edu"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
                {loginError}
              </div>
            )}

            <button type="submit" className="btn btn-blue w-full">
              Login as Admin
            </button>
          </form>

          <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Demo: <span className="font-mono font-semibold text-slate-700">admin@geeta.edu</span> /{' '}
            <span className="font-mono font-semibold text-slate-700">admin123</span>
          </p>
        </div>
        <Link href="/" className="mt-6 text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">A</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Geeta University</p>
              <h1 className="text-lg font-bold leading-tight text-slate-900">Welcome, Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => document.getElementById('audit-log')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Audit Log
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
          {/* Share form */}
          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">Share New Document</h2>
            <p className="mt-1 text-sm text-slate-500">Generate a single-use, device-locked link.</p>

            <form onSubmit={handleGenerate} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="student-name">Student Name</label>
                <input
                  id="student-name"
                  className="input"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Vibhansh Vats"
                />
              </div>
              <div>
                <label className="label" htmlFor="roll-no">Roll No</label>
                <input
                  id="roll-no"
                  className="input font-mono uppercase"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="GEETA-CS-045"
                />
              </div>
              <div>
                <label className="label" htmlFor="contact">Student Contact Number</label>
                <input
                  id="contact"
                  className="input font-mono"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="9876543210"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="label" htmlFor="doc-type">Select Document Type</label>
                <select
                  id="doc-type"
                  className="input"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="doc-file">Upload File (PDF / Image)</label>
                <input
                  id="doc-file"
                  type="file"
                  accept=".pdf,image/*"
                  className="input input-file"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                />
                {fileName && <p className="mt-1 truncate text-xs text-slate-500">Selected: {fileName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="start-time">Start Time</label>
                  <input
                    id="start-time"
                    type="time"
                    className="input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="end-time">End Time</label>
                  <input
                    id="end-time"
                    type="time"
                    className="input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <button type="submit" className="btn btn-green w-full">
                Generate Secure Link
              </button>
            </form>

            {created && (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-800">Link Created for {created.studentName}</p>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all font-mono text-xs text-blue-700 underline underline-offset-2"
                >
                  {link}
                </a>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" className="btn btn-green btn-sm" onClick={handleWhatsApp}>
                    Send on WhatsApp to {created.contact}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-green-800/80">
                  This link works only for this student, on first device, for 60 sec.
                </p>
              </div>
            )}
          </section>

          {/* Shared documents */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Shared Documents</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {docs.length} total
              </span>
            </div>
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-5 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Document</th>
                    <th className="px-3 py-2.5">Contact</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                        No documents shared yet
                      </td>
                    </tr>
                  )}
                  {docs.map((doc) => (
                    <tr key={doc.token} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-800">{doc.studentName}</div>
                        <div className="font-mono text-[11px] text-slate-400">{doc.token}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{doc.rollNo}</td>
                      <td className="px-3 py-3">
                        <div className="text-slate-700">{doc.documentType}</div>
                        <div className="max-w-[160px] truncate text-[11px] text-slate-400">{doc.fileName}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{doc.contact}</td>
                      <td className="px-3 py-3"><StatusPill doc={doc} /></td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          className="btn btn-red btn-sm"
                          disabled={doc.revoked}
                          onClick={() => handleRevoke(doc.token)}
                        >
                          {doc.revoked ? 'Revoked' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Audit log */}
        <section id="audit-log" className="card overflow-hidden scroll-mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">AUDIT LOG — Who Opened What</h2>
              <p className="text-xs text-slate-500">Auto-refreshes every 2 seconds. Every attempt is recorded.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {audit.length} events
            </span>
          </div>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Visitor Name</th>
                  <th className="px-3 py-2.5">Roll No</th>
                  <th className="px-3 py-2.5">IP Address</th>
                  <th className="px-3 py-2.5">Document</th>
                  <th className="px-3 py-2.5">Device</th>
                  <th className="px-3 py-2.5">Result</th>
                  <th className="px-4 py-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                      No activity yet. Open a secure link to see events appear here.
                    </td>
                  </tr>
                )}
                {audit.map((entry) => (
                  <tr key={entry.id} className={entry.result === 'DENIED' ? 'bg-red-50/40' : undefined}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{formatAuditTime(entry.time)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{entry.visitorName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{entry.rollNo}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{entry.ip}</td>
                    <td className="px-3 py-2.5 text-slate-700">{entry.document}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{entry.device}</td>
                    <td className="px-3 py-2.5"><ResultPill result={entry.result} /></td>
                    <td className="max-w-[280px] px-4 py-2.5 text-xs text-slate-600">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
