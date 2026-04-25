export type DemoAccount = {
  email: string;
  password: string;
  updatedAt: string;
};

export type DemoSession = {
  email: string;
  startedAt: string;
};

const DB_NAME = 'litestore-demo-auth';
const DB_VERSION = 1;
const STORE_NAME = 'accounts';
const SESSION_KEY = 'litestore:session';

function isBrowser() {
  return typeof window !== 'undefined';
}

function openAuthDb() {
  if (!isBrowser()) {
    return Promise.reject(new Error('IndexedDB is only available in the browser.'));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'email' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open demo auth database.'));
  });
}

async function readAccount(email: string) {
  const db = await openAuthDb();

  return await new Promise<DemoAccount | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(email);

    request.onsuccess = () => resolve((request.result as DemoAccount | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to read demo account.'));
    transaction.oncomplete = () => db.close();
  });
}

export async function createDemoAccount(email: string, password: string) {
  const existing = await readAccount(email);
  if (existing) {
    throw new Error('An account already exists for this email.');
  }

  const db = await openAuthDb();

  return await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const account: DemoAccount = {
      email,
      password,
      updatedAt: new Date().toISOString()
    };

    const request = store.put(account);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to create demo account.'));
    transaction.oncomplete = () => db.close();
  });
}

export async function verifyDemoPassword(email: string, password: string) {
  const account = await readAccount(email);
  return Boolean(account && account.password === password);
}

export async function saveOrVerifyDemoAccount(email: string, password: string) {
  const existing = await readAccount(email);

  if (!existing) {
    await createDemoAccount(email, password);
    return true;
  }

  return existing.password === password;
}

export function saveSession(email: string) {
  if (!isBrowser()) return;

  const session: DemoSession = {
    email,
    startedAt: new Date().toISOString()
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession() {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}
