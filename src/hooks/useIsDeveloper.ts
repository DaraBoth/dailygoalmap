import { useAuth } from '@/hooks/useAuth';

export function useIsDeveloper(): boolean {
  const { user } = useAuth();
  const list = (import.meta.env.VITE_DEVELOPER_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!user?.email && list.includes(user.email.toLowerCase());
}
