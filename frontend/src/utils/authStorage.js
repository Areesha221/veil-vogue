const TOKEN_KEY = 'veil-vogue-token';
const USER_KEY = 'veil-vogue-user';
const REMEMBER_EMAIL_KEY = 'vv-remember-email';

const canUseStorage = (storage) => {
  try {
    if (!storage) return false;
    const k = '__vv_auth_test__';
    storage.setItem(k, '1');
    storage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};

const safeGet = (storage, key) => {
  try {
    if (!storage || !canUseStorage(storage)) return null;
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage, key, value) => {
  try {
    if (!storage || !canUseStorage(storage)) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeRemove = (storage, key) => {
  try {
    if (!storage || !canUseStorage(storage)) return;
    storage.removeItem(key);
  } catch {
    // ignore
  }
};

const getAvailableStores = () => {
  const stores = [];
  try { if (typeof localStorage !== 'undefined') stores.push(localStorage); } catch {}
  try { if (typeof sessionStorage !== 'undefined') stores.push(sessionStorage); } catch {}
  return stores.filter(canUseStorage);
};

export const getAuthToken = () => {
  return safeGet(localStorage, TOKEN_KEY) || safeGet(sessionStorage, TOKEN_KEY) || '';
};

export const getStoredUser = () => {
  const raw = safeGet(localStorage, USER_KEY) || safeGet(sessionStorage, USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const isAuthRemembered = () => Boolean(safeGet(localStorage, TOKEN_KEY));

export const setAuth = (token, user, rememberMe = true) => {
  const preferred = rememberMe ? localStorage : sessionStorage;
  const fallback = rememberMe ? sessionStorage : localStorage;
  const primary = canUseStorage(preferred) ? preferred : (canUseStorage(fallback) ? fallback : null);
  const secondary = primary === localStorage ? sessionStorage : (primary === sessionStorage ? localStorage : null);

  if (secondary) {
    safeRemove(secondary, TOKEN_KEY);
    safeRemove(secondary, USER_KEY);
  }

  // Always clear opposite store to prevent stale mixed sessions
  if (primary === localStorage) {
    safeRemove(sessionStorage, TOKEN_KEY);
    safeRemove(sessionStorage, USER_KEY);
  } else if (primary === sessionStorage) {
    safeRemove(localStorage, TOKEN_KEY);
    safeRemove(localStorage, USER_KEY);
  }

  if (!primary) return;

  if (token) safeSet(primary, TOKEN_KEY, token);
  else safeRemove(primary, TOKEN_KEY);

  if (user) safeSet(primary, USER_KEY, JSON.stringify(user));
  else safeRemove(primary, USER_KEY);
};

export const clearAuth = (options = {}) => {
  const { keepRememberedEmail = false } = options;
  for (const store of getAvailableStores()) {
    safeRemove(store, TOKEN_KEY);
    safeRemove(store, USER_KEY);
  }
  if (!keepRememberedEmail) safeRemove(localStorage, REMEMBER_EMAIL_KEY);
};

export const getRememberedEmail = () => safeGet(localStorage, REMEMBER_EMAIL_KEY) || '';

export const setRememberedEmail = (email) => {
  const value = String(email || '').trim();
  if (value) safeSet(localStorage, REMEMBER_EMAIL_KEY, value);
  else safeRemove(localStorage, REMEMBER_EMAIL_KEY);
};
