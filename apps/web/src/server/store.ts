// Netlify Blobs-backed data store for the GhostMD backend.
//
// All persistent application state lives here. Access patterns are entirely
// key-based (user by email, user by id, portfolio by userId, per-user lists,
// session by refresh token), which is exactly what an object store handles
// well. Data persists across deploys and function invocations.
import { getStore, type Store } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

export interface PortfolioRecord {
  id: string;
  userId: string;
  balance: number;
  totalDeposited: number;
  totalEarnings: number;
  lastCompounded: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotRecord {
  id: string;
  portfolioId: string;
  balance: number;
  snapshotAt: string;
}

export interface DepositRecord {
  id: string;
  userId: string;
  stripePaymentIntentId: string | null;
  amountUsd: number;
  status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';
  confirmedAt: string | null;
  createdAt: string;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  amountUsd: number;
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED';
  createdAt: string;
}

export interface SessionRecord {
  refreshToken: string;
  userId: string;
  expiresAt: string;
}

const now = () => new Date().toISOString();

let _store: Store | null = null;
function store(): Store {
  if (!_store) {
    // Strong consistency so a read immediately following a write (e.g. balance
    // after a deposit, session after login) reflects the latest value.
    _store = getStore({ name: 'ghostmd', consistency: 'strong' });
  }
  return _store;
}

async function getJSON<T>(key: string): Promise<T | null> {
  return (await store().get(key, { type: 'json' })) as T | null;
}
async function setJSON(key: string, value: unknown): Promise<void> {
  await store().setJSON(key, value as any);
}

export function toPublicUser(u: UserRecord): PublicUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

// --- Auth signing secret -------------------------------------------------
// Prefer an operator-provided secret; otherwise generate one once and persist
// it so all function instances sign/verify tokens with the same key.
export async function getAuthSecret(): Promise<string> {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  const existing = await getJSON<{ secret: string }>('meta/authsecret');
  if (existing?.secret) return existing.secret;

  const secret = randomUUID() + randomUUID();
  await setJSON('meta/authsecret', { secret });
  return secret;
}

// --- Users ---------------------------------------------------------------
const emailKey = (email: string) => `users/by-email/${email.trim().toLowerCase()}`;

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const id = await store().get(emailKey(email), { type: 'text' });
  if (!id) return null;
  return getUserById(id);
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  return getJSON<UserRecord>(`users/${id}`);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}): Promise<UserRecord> {
  const id = randomUUID();
  const ts = now();
  const user: UserRecord = {
    id,
    email: input.email.trim(),
    firstName: input.firstName,
    lastName: input.lastName,
    kycStatus: 'PENDING',
    passwordHash: input.passwordHash,
    createdAt: ts,
    updatedAt: ts,
  };
  await setJSON(`users/${id}`, user);
  await store().set(emailKey(input.email), id);

  // Every user gets an empty portfolio on creation.
  const portfolio: PortfolioRecord = {
    id: randomUUID(),
    userId: id,
    balance: 0,
    totalDeposited: 0,
    totalEarnings: 0,
    lastCompounded: null,
    createdAt: ts,
    updatedAt: ts,
  };
  await setJSON(`portfolios/${id}`, portfolio);
  return user;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  const user = await getUserById(id);
  if (!user) return;
  user.passwordHash = passwordHash;
  user.updatedAt = now();
  await setJSON(`users/${id}`, user);
}

// --- Portfolio -----------------------------------------------------------
export async function getPortfolio(userId: string): Promise<PortfolioRecord | null> {
  return getJSON<PortfolioRecord>(`portfolios/${userId}`);
}

async function savePortfolio(p: PortfolioRecord): Promise<PortfolioRecord> {
  p.updatedAt = now();
  await setJSON(`portfolios/${p.userId}`, p);
  return p;
}

export async function getSnapshots(userId: string): Promise<SnapshotRecord[]> {
  return (await getJSON<SnapshotRecord[]>(`snapshots/${userId}`)) ?? [];
}

async function addSnapshot(portfolioId: string, userId: string, balance: number): Promise<void> {
  const snaps = await getSnapshots(userId);
  snaps.push({ id: randomUUID(), portfolioId, balance, snapshotAt: now() });
  // Keep the most recent 90 snapshots (matches the original history window).
  await setJSON(`snapshots/${userId}`, snaps.slice(-90));
}

// Credit a confirmed deposit: increase balance + totalDeposited, record a
// performance snapshot so the dashboard chart has a data point.
export async function creditDeposit(userId: string, amountUsd: number): Promise<PortfolioRecord | null> {
  const p = await getPortfolio(userId);
  if (!p) return null;
  p.balance = round2(p.balance + amountUsd);
  p.totalDeposited = round2(p.totalDeposited + amountUsd);
  const saved = await savePortfolio(p);
  await addSnapshot(p.id, userId, saved.balance);
  return saved;
}

export async function debitWithdrawal(userId: string, amountUsd: number): Promise<PortfolioRecord | null> {
  const p = await getPortfolio(userId);
  if (!p) return null;
  p.balance = round2(p.balance - amountUsd);
  return savePortfolio(p);
}

// --- Deposits ------------------------------------------------------------
export async function getDeposits(userId: string): Promise<DepositRecord[]> {
  const list = (await getJSON<DepositRecord[]>(`deposits/${userId}`)) ?? [];
  // Newest first.
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addDeposit(input: {
  userId: string;
  amountUsd: number;
  status: DepositRecord['status'];
  stripePaymentIntentId?: string | null;
}): Promise<DepositRecord> {
  const list = (await getJSON<DepositRecord[]>(`deposits/${input.userId}`)) ?? [];
  const deposit: DepositRecord = {
    id: randomUUID(),
    userId: input.userId,
    stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    amountUsd: round2(input.amountUsd),
    status: input.status,
    confirmedAt: input.status === 'CONFIRMED' ? now() : null,
    createdAt: now(),
  };
  list.push(deposit);
  await setJSON(`deposits/${input.userId}`, list);
  return deposit;
}

export async function confirmDeposit(userId: string, depositId: string): Promise<DepositRecord | null> {
  const list = (await getJSON<DepositRecord[]>(`deposits/${userId}`)) ?? [];
  const deposit = list.find((d) => d.id === depositId);
  if (!deposit) return null;
  if (deposit.status !== 'CONFIRMED') {
    deposit.status = 'CONFIRMED';
    deposit.confirmedAt = now();
    await setJSON(`deposits/${userId}`, list);
  }
  return deposit;
}

// --- Withdrawals ---------------------------------------------------------
export async function getWithdrawals(userId: string): Promise<WithdrawalRecord[]> {
  const list = (await getJSON<WithdrawalRecord[]>(`withdrawals/${userId}`)) ?? [];
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addWithdrawal(userId: string, amountUsd: number): Promise<WithdrawalRecord> {
  const list = (await getJSON<WithdrawalRecord[]>(`withdrawals/${userId}`)) ?? [];
  const withdrawal: WithdrawalRecord = {
    id: randomUUID(),
    userId,
    amountUsd: round2(amountUsd),
    status: 'REQUESTED',
    createdAt: now(),
  };
  list.push(withdrawal);
  await setJSON(`withdrawals/${userId}`, list);
  return withdrawal;
}

// --- Sessions (refresh tokens) ------------------------------------------
export async function createSession(userId: string, ttlDays = 7): Promise<SessionRecord> {
  const refreshToken = randomUUID() + randomUUID();
  const session: SessionRecord = {
    refreshToken,
    userId,
    expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString(),
  };
  await setJSON(`sessions/${refreshToken}`, session);
  return session;
}

export async function getSession(refreshToken: string): Promise<SessionRecord | null> {
  if (!refreshToken) return null;
  return getJSON<SessionRecord>(`sessions/${refreshToken}`);
}

export async function deleteSession(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  await store().delete(`sessions/${refreshToken}`);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
