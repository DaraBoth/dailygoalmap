import { useEffect, useState } from 'react';
import { getCurrentAccount, getCurrentAccountPreference, type SavedAccount } from '@/utils/savedAccounts';

/**
 * Hook to access the current active account preference across the app
 * Returns the currently active saved account object or null
 */
export function useCurrentAccount() {
  const [currentAccount, setCurrentAccount] = useState<SavedAccount | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Get current account on mount
    const account = getCurrentAccount();
    setCurrentAccount(account);
    setCurrentAccountId(getCurrentAccountPreference());

    // Listen to storage changes (when switching accounts in another tab)
    const handleStorageChange = () => {
      const newAccount = getCurrentAccount();
      setCurrentAccount(newAccount);
      setCurrentAccountId(getCurrentAccountPreference());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    currentAccount,
    currentAccountId,
  };
}
