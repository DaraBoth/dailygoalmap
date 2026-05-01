const STORAGE_KEY = "orbit_saved_accounts";

export interface SavedAccount {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
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
