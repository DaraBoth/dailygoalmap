import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  };
  private listeners: Array<(state: AuthState) => void> = [];

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session && !error) {
        this.updateAuthState(session.user, session);
      } else {
        this.updateAuthState(null, null);
      }

      supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          this.updateAuthState(session.user, session);
        } else if (event === 'SIGNED_OUT') {
          this.updateAuthState(null, null);
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  private updateAuthState(user: User | null, session: Session | null): void {
    this.authState = {
      user,
      session,
      isLoading: false,
      isAuthenticated: !!user && !!session,
    };
    this.notifyListeners();
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.authState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  public isLoading(): boolean {
    return this.authState.isLoading;
  }

  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  public getCurrentSession(): Session | null {
    return this.authState.session;
  }

  public async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      this.updateAuthState(null, null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  public getRedirectPath(currentPath: string, isPWA: boolean = false): string {
    if (!this.isAuthenticated()) {
      if (currentPath === '/' || currentPath === '') return '/';
      return '/login';
    }
    if (currentPath === '/' || currentPath === '') {
      if (isPWA) return '/dashboard';
      return '/';
    }
    if (currentPath === '/login' || currentPath === '/register') return '/dashboard';
    return currentPath;
  }

  public isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
  }

  public destroy(): void {
    this.listeners = [];
  }
}

export const authService = AuthService.getInstance();
export default authService;
