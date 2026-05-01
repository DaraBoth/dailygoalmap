const STORAGE_KEY = "orbit_saved_accounts";
const CURRENT_ACCOUNT_KEY = "orbit_current_account";

export interface SavedAccount {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  savedAt: number;
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccount(account: Omit<SavedAccount, "savedAt">): void {
  const accounts = getSavedAccounts();
  const existing = accounts.findIndex((a) => a.id === account.id);
  const entry: SavedAccount = { ...account, savedAt: Date.now() };
  if (existing >= 0) {
    accounts[existing] = entry;
  } else {
    accounts.push(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeAccount(id: string): void {
  const accounts = getSavedAccounts().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/**
 * Get a specific saved account by ID
 */
export function getAccountById(id: string): SavedAccount | undefined {
  return getSavedAccounts().find((a) => a.id === id);
}

/**
 * Set the currently active account preference
 */
export function setCurrentAccountPreference(id: string): void {
  localStorage.setItem(CURRENT_ACCOUNT_KEY, id);
}

/**
 * Get the currently active account preference
 */
export function getCurrentAccountPreference(): string | null {
  return localStorage.getItem(CURRENT_ACCOUNT_KEY);
}

/**
 * Clear the currently active account preference (called on logout)
 */
export function clearCurrentAccountPreference(): void {
  localStorage.removeItem(CURRENT_ACCOUNT_KEY);
}

/**
 * Get the current active account object (combines preference with saved accounts)
 */
export function getCurrentAccount(): SavedAccount | null {
  const currentId = getCurrentAccountPreference();
  if (!currentId) return null;
  return getAccountById(currentId) || null;
}
