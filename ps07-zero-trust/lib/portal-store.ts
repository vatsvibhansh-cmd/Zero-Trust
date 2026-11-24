export type DocumentType = 'Admit Card' | 'Marksheet' | 'Fees Receipt' | 'Certificate';
export type AuditResult = 'ALLOWED' | 'DENIED';
export type DocStatus = 'Active' | 'Expired' | 'Revoked' | 'Leak Attempt';

export interface StudentRecord {
  name: string;
  rollNo: string;
  contact: string;
  password: string;
}

export interface SharedDocument {
  token: string;
  studentName: string;
  rollNo: string;
  contact: string;
  documentType: DocumentType;
  fileName: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  revoked: boolean;
  leaked: boolean;
  used: boolean;
  lockedIp: string | null;
  firstViewedAt: string | null;
  viewExpiresAt: string | null;
}

export interface AuditEntry {
  id: string;
  time: string;
  visitorName: string;
  rollNo: string;
  ip: string;
  document: string;
  device: string;
  result: AuditResult;
  reason: string;
}

export interface Device {
  id: 'device1' | 'device2';
  short: string;
  name: string;
  ip: string;
}

export const DEVICE_1: Device = {
  id: 'device1',
  short: 'Device 1',
  name: 'My Phone',
  ip: '192.168.1.10',
};

export const DEVICE_2: Device = {
  id: 'device2',
  short: 'Device 2',
  name: "Friend's Phone",
  ip: '192.168.1.99',
};

export const ADMIN_EMAIL = 'admin@geeta.edu';
export const ADMIN_PASSWORD = 'admin123';
export const DEMO_OTP = '123456';

export const DEMO_STUDENT: StudentRecord = {
  name: 'Vibhansh Vats',
  rollNo: 'GEETA-CS-045',
  contact: '9876543210',
  password: 'student123',
};

const K = {
  students: 'gu_students_v2',
  documents: 'gu_documents_v2',
  audit: 'gu_audit_v2',
  adminSession: 'gu_admin_session_v2',
  studentSession: 'gu_student_session_v2',
};

function canStore() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function read<T>(key: string, fallback: T): T {
  if (!canStore()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode / quota) — demo keeps running in memory.
  }
}

function seedDoc(): SharedDocument {
  const now = new Date();
  return {
    token: 'TOKEN-DEMO01',
    studentName: DEMO_STUDENT.name,
    rollNo: DEMO_STUDENT.rollNo,
    contact: DEMO_STUDENT.contact,
    documentType: 'Admit Card',
    fileName: 'admit-card-sem-5.pdf',
    startTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
    revoked: false,
    leaked: false,
    used: false,
    lockedIp: null,
    firstViewedAt: null,
    viewExpiresAt: null,
  };
}

export function ensureSeed() {
  if (!canStore()) return;
  if (localStorage.getItem(K.students) === null) write(K.students, [DEMO_STUDENT]);
  if (localStorage.getItem(K.documents) === null) write(K.documents, [seedDoc()]);
  if (localStorage.getItem(K.audit) === null) write(K.audit, []);
}

export function loadStudents(): StudentRecord[] {
  ensureSeed();
  return read<StudentRecord[]>(K.students, [DEMO_STUDENT]);
}

export function loadDocuments(): SharedDocument[] {
  ensureSeed();
  return read<SharedDocument[]>(K.documents, []);
}

export function saveDocuments(docs: SharedDocument[]) {
  write(K.documents, docs);
}

export function loadAudit(): AuditEntry[] {
  ensureSeed();
  return read<AuditEntry[]>(K.audit, []);
}

function saveAudit(entries: AuditEntry[]) {
  write(K.audit, entries);
}

export function addAudit(entry: Omit<AuditEntry, 'id' | 'time'>) {
  ensureSeed();
  const entries = loadAudit();
  const next: AuditEntry = {
    ...entry,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    time: new Date().toISOString(),
  };
  saveAudit([next, ...entries]);
  return next;
}

export function isAdminLoggedIn(): boolean {
  return canStore() && localStorage.getItem(K.adminSession) === '1';
}

export function loginAdmin(): boolean {
  if (!canStore()) return false;
  localStorage.setItem(K.adminSession, '1');
  return true;
}

export function logoutAdmin() {
  if (canStore()) localStorage.removeItem(K.adminSession);
}

export interface StudentSession {
  name: string;
  rollNo: string;
  contact: string;
}

export function getStudentSession(): StudentSession | null {
  return read<StudentSession | null>(K.studentSession, null);
}

export function setStudentSession(session: StudentSession) {
  write(K.studentSession, session);
}

export function clearStudentSession() {
  if (canStore()) localStorage.removeItem(K.studentSession);
}

export function createToken(existing: SharedDocument[]): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const token = `TOKEN-${code}`;
    if (!existing.some((d) => d.token === token)) return token;
  }
  return `TOKEN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export interface ShareInput {
  studentName: string;
  rollNo: string;
  contact: string;
  documentType: DocumentType;
  fileName: string;
  startTime: string;
  endTime: string;
}

export function createShare(input: ShareInput): SharedDocument {
  const docs = loadDocuments();
  const doc: SharedDocument = {
    token: createToken(docs),
    studentName: input.studentName.trim(),
    rollNo: input.rollNo.trim(),
    contact: input.contact.trim(),
    documentType: input.documentType,
    fileName: input.fileName,
    startTime: input.startTime,
    endTime: input.endTime,
    createdAt: new Date().toISOString(),
    revoked: false,
    leaked: false,
    used: false,
    lockedIp: null,
    firstViewedAt: null,
    viewExpiresAt: null,
  };
  saveDocuments([doc, ...docs]);
  return doc;
}

export function revokeDocument(token: string) {
  const docs = loadDocuments().map((d) => (d.token === token ? { ...d, revoked: true } : d));
  saveDocuments(docs);
}

export function findDocument(token: string): SharedDocument | null {
  return loadDocuments().find((d) => d.token === token) ?? null;
}

function saveDocument(doc: SharedDocument) {
  const docs = loadDocuments().map((d) => (d.token === doc.token ? doc : d));
  saveDocuments(docs);
}

export function docStatus(doc: SharedDocument): DocStatus {
  if (doc.revoked) return 'Revoked';
  if (doc.leaked) return 'Leak Attempt';
  const now = Date.now();
  if (doc.used && doc.viewExpiresAt && new Date(doc.viewExpiresAt).getTime() < now) return 'Expired';
  if (new Date(doc.endTime).getTime() < now) return 'Expired';
  return 'Active';
}

export type DenialReason =
  | 'Time Expired'
  | 'Revoked by Admin'
  | 'Link Already Used'
  | 'IP Mismatch - Possible Forwarding'
  | 'Details Mismatch'
  | 'Link Not Found';

export interface OpenResult {
  allowed: boolean;
  reason?: DenialReason;
  doc?: SharedDocument;
}

/**
 * Runs the five zero-trust checks in order and writes one audit row per attempt.
 * Check 3 (single use) is only a denial for the same locked device — a different
 * device is caught by check 4 so forwarding is reported as a leak attempt.
 */
export function openDocument(token: string, student: StudentSession, device: Device): OpenResult {
  ensureSeed();
  const docs = loadDocuments();
  const index = docs.findIndex((d) => d.token === token);

  if (index < 0) {
    addAudit({
      visitorName: student.name,
      rollNo: student.rollNo,
      ip: device.ip,
      document: 'Unknown Document',
      device: device.short,
      result: 'DENIED',
      reason: 'Link Not Found',
    });
    return { allowed: false, reason: 'Link Not Found' };
  }

  const doc = { ...docs[index] };
  const now = new Date();

  const deny = (reason: DenialReason, auditReason = reason): OpenResult => {
    addAudit({
      visitorName: student.name,
      rollNo: student.rollNo,
      ip: device.ip,
      document: doc.documentType,
      device: device.short,
      result: 'DENIED',
      reason: auditReason,
    });
    return { allowed: false, reason };
  };

  // 1. Time window
  if (now.getTime() < new Date(doc.startTime).getTime() || now.getTime() > new Date(doc.endTime).getTime()) {
    return deny('Time Expired');
  }

  // 2. Admin revoke
  if (doc.revoked) return deny('Revoked by Admin');

  // 3. Single-use token (same device revisiting)
  if (doc.used && (!doc.lockedIp || doc.lockedIp === device.ip)) {
    return deny('Link Already Used');
  }

  // 4. Device IP lock — a different device means the link was forwarded
  if (doc.lockedIp && doc.lockedIp !== device.ip) {
    doc.leaked = true;
    saveDocument(doc);
    return deny('IP Mismatch - Possible Forwarding', 'Leak Attempt - Link Forwarded (IP Mismatch)');
  }

  // 5. Role check — only the student the document was shared with
  if (student.rollNo.trim().toUpperCase() !== doc.rollNo.trim().toUpperCase()) {
    return deny('Details Mismatch');
  }

  doc.lockedIp = doc.lockedIp ?? device.ip;
  doc.firstViewedAt = doc.firstViewedAt ?? now.toISOString();
  doc.viewExpiresAt = new Date(now.getTime() + 60 * 1000).toISOString();
  doc.used = true;
  saveDocument(doc);

  addAudit({
    visitorName: student.name,
    rollNo: doc.rollNo,
    ip: device.ip,
    document: doc.documentType,
    device: device.short,
    result: 'ALLOWED',
    reason: 'All 5 checks passed - 60 sec window started',
  });

  return { allowed: true, doc };
}

export function logViewingExpired(doc: SharedDocument, student: StudentSession, device: Device) {
  addAudit({
    visitorName: student.name,
    rollNo: student.rollNo,
    ip: device.ip,
    document: doc.documentType,
    device: device.short,
    result: 'DENIED',
    reason: 'Time Expired (60s viewing window closed, token destroyed)',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatAuditTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function toLocalTimeValue(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function timeTodayIso(time: string): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}
