import { api } from "@/integrations/api/client";
import type { AppRole } from "@/types/cv";

const SESSION_STORAGE_KEY = "auth_session";
const DEV_AUTH_STORAGE_KEY = "dev_auth_state";

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSessionResponse {
  session: Session | null;
  user: AuthUser | null;
}

interface DevAuthState {
  role: AppRole;
  user: AuthUser;
  session: Session;
}

const isDevAuthEnabled = () => import.meta.env.VITE_ENABLE_DEV_AUTH === "true";

export const auth = {
  isDevAuthEnabled,

  getStoredDevAuth(): DevAuthState | null {
    const raw = localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DevAuthState;
    } catch {
      localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
      return null;
    }
  },

  setStoredDevAuth(state: DevAuthState | null) {
    if (!state) {
      localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(state));
  },

  getStoredSession(): Session | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Session;
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  },

  setStoredSession(session: Session | null) {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  },

  async getSession(): Promise<AuthSessionResponse> {
    if (isDevAuthEnabled()) {
      const devAuth = this.getStoredDevAuth();
      if (devAuth) {
        this.setStoredSession(devAuth.session);
        return { session: devAuth.session, user: devAuth.user };
      }
    }

    const session = this.getStoredSession();
    if (!session?.access_token) {
      return { session: null, user: null };
    }

    const user = await api.get<AuthUser>("/auth/me", {
       token: session.access_token //whatever data we get from this endpoint, we store it in AuthUser type
    });
    return { session, user };
  },

  async getUserRole(userId: string): Promise<AppRole | null> {
    if (isDevAuthEnabled()) {
      const devAuth = this.getStoredDevAuth();
      if (devAuth?.user.id === userId) {
        return devAuth.role;
      }
    }

    return api.get<AppRole>(`/users/${userId}/role`);
  },

  async signIn(email: string, password: string): Promise<AuthSessionResponse> {
    const response = await api.post<AuthSessionResponse>("/auth/login", { email, password });
    this.setStoredSession(response.session);
    return response;
  },

  signInAsDevRole(role: AppRole): AuthSessionResponse {
    const devState: DevAuthState = {
      role,
      user: {
        id: `dev-${role}`,
        email: `${role}@dev.local`,
      },
      session: {
        access_token: `dev-token-${role}`,
      },
    };
    this.setStoredDevAuth(devState);
    this.setStoredSession(devState.session);
    return { session: devState.session, user: devState.user };
  },

  signUp(email: string, password: string, fullName: string) {
    return api.post<void>("/auth/signup", {
      email,
      password,
      full_name: fullName,
      email_redirect_to: window.location.origin,
    });
  },

  requestPasswordReset(email: string) {
    return api.post<void>("/auth/forgot-password", {
      email,
      redirect_to: `${window.location.origin}/reset-password`,
    });
  },

  resetPassword(password: string) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const accessToken =
      hashParams.get("access_token") ||
      queryParams.get("access_token") ||
      this.getStoredSession()?.access_token;

    return api.post<void>("/auth/reset-password", {
      password,
      access_token: accessToken,
    });
  },

  async signOut() {
    if (isDevAuthEnabled()) {
      this.setStoredDevAuth(null);
    }

    const session = this.getStoredSession();
    if (session?.access_token && !session.access_token.startsWith("dev-token-")) {
      try {
        await api.post<void>("/auth/logout", {}, { token: session.access_token });
      } catch {
        // Clear client session even if backend logout fails.
      }
    }
    this.setStoredSession(null);
  },
};
