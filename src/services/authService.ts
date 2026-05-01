import { supabase } from '@/integrations/supabase/client';
import { clearCurrentAccountPreference } from '@/utils/savedAccounts';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SessionData {
  user: User;
  session: Session;
  expiresAt: number;
  lastValidated: number;
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
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_STORAGE_KEY = 'orbit_session';
  private readonly SESSION_VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiry

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication system
   */
  private async initializeAuth(): Promise<void> {
    try {
      // First, try to restore session from storage for immediate UI response
      const storedSession = this.getStoredSession();

      if (storedSession && this.isSessionValid(storedSession)) {
        // Optimistically set the auth state from storage
        this.updateAuthState(storedSession.user, storedSession.session);
        this.authState.isLoading = false;
        this.notifyListeners();

        // Validate with Supabase in the background
        this.validateCurrentSession().catch(err => {
          console.error('Background session validation failed:', err);
        });
      } else {
        // No valid stored session, check with Supabase (this bit is still blocking but necessary)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && !error) {
          this.updateAuthState(session.user, session);
          this.storeSession(session.user, session);
        } else {
          this.updateAuthState(null, null);
          this.clearStoredSession();
        }
        this.authState.isLoading = false;
        this.notifyListeners();
      }

      // Set up auth state listener
      supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          this.updateAuthState(session.user, session);
          this.storeSession(session.user, session);
        } else if (event === 'SIGNED_OUT') {
          this.updateAuthState(null, null);
          this.clearStoredSession();
          clearCurrentAccountPreference();
        }
      });

      // Start periodic session validation
      this.startSessionValidation();

    } catch (error) {
      console.error('Auth initialization error:', error);
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * Update authentication state and notify listeners
   */
  private updateAuthState(user: User | null, session: Session | null): void {
    this.authState = {
      user,
      session,
      isLoading: false,
      isAuthenticated: !!user && !!session,
    };
    this.notifyListeners();
  }

  /**
   * Store session data in localStorage
   */
  private storeSession(user: User, session: Session): void {
    try {
      const sessionData: SessionData = {
        user,
        session,
        expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + (24 * 60 * 60 * 1000),
        lastValidated: Date.now(),
      };

      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  /**
   * Get stored session from localStorage
   */
  private getStoredSession(): SessionData | null {
    try {
      const stored = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (!stored) return null;

      return JSON.parse(stored) as SessionData;
    } catch (error) {
      console.error('Failed to parse stored session:', error);
      this.clearStoredSession();
      return null;
    }
  }

  /**
   * Clear stored session from localStorage
   */
  private clearStoredSession(): void {
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored session:', error);
    }
  }

  /**
   * Check if stored session is still valid
   */
  private isSessionValid(sessionData: SessionData): boolean {
    const now = Date.now();

    // Check if session has expired
    if (now >= sessionData.expiresAt) {
      return false;
    }

    // Check if session needs validation (hasn't been validated recently)
    const timeSinceValidation = now - sessionData.lastValidated;
    if (timeSinceValidation > this.SESSION_VALIDATION_INTERVAL) {
      return false;
    }

    return true;
  }

  /**
   * Start periodic session validation
   */
  private startSessionValidation(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(async () => {
      if (this.authState.isAuthenticated) {
        await this.validateCurrentSession();
      }
    }, 900000); // Every 15 minutes (reduced from 5 minutes to save CPU)
  }

  /**
   * Validate current session with Supabase
   */
  private async validateCurrentSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Session is invalid, sign out
        this.updateAuthState(null, null);
        this.clearStoredSession();
        return false;
      }

      // Check if session needs refresh
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;

      if (expiresAt - now < this.SESSION_REFRESH_THRESHOLD) {
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshedSession && !refreshError) {
          this.updateAuthState(refreshedSession.user, refreshedSession);
          this.storeSession(refreshedSession.user, refreshedSession);
        }
      } else {
        // Update last validated time
        this.storeSession(session.user, session);
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Subscribe to auth state changes
   */
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);

    // Immediately call listener with current state
    listener(this.authState);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  /**
   * Get current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Check if auth is still loading
   */
  public isLoading(): boolean {
    return this.authState.isLoading;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): Session | null {
    return this.authState.session;
  }

  /**
   * Sign out user
   */
  public async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      this.updateAuthState(null, null);
      this.clearStoredSession();
      clearCurrentAccountPreference();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Determine where to redirect user based on auth state and context
   */
  public getRedirectPath(currentPath: string, isPWA: boolean = false): string {
    if (!this.isAuthenticated()) {
      // Not authenticated
      if (currentPath === '/' || currentPath === '') {
        return '/'; // Stay on landing page
      }
      return '/login'; // Redirect to login for protected routes
    }

    // Authenticated user
    if (currentPath === '/' || currentPath === '') {
      // On landing page
      if (isPWA) {
        return '/dashboard'; // PWA should go to dashboard
      }
      return '/'; // Web can stay on landing page (will show authenticated UI)
    }

    if (currentPath === '/login' || currentPath === '/register') {
      return '/dashboard'; // Redirect away from auth pages
    }

    return currentPath; // Stay on current path
  }

  /**
   * Check if current environment is PWA
   */
  public isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
