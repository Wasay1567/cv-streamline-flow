import { api } from "@/integrations/api/client";
import type { AppRole } from "@/types/cv";

const DEV_AUTH_STORAGE_KEY = "dev_auth_state";
const PROFILE_SETUP_KEY = "profile_setup_complete";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileSetupComplete?: boolean;
}

interface DevAuthState {
  role: AppRole;
  user: AuthUser;
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

  isProfileSetupComplete(): boolean {
    const stored = localStorage.getItem(PROFILE_SETUP_KEY);
    return stored === 'true';
  },

  setProfileSetupComplete(complete: boolean) {
    if (complete) {
      localStorage.setItem(PROFILE_SETUP_KEY, 'true');
    } else {
      localStorage.removeItem(PROFILE_SETUP_KEY);
    }
  },

  clearProfileSetup() {
    localStorage.removeItem(PROFILE_SETUP_KEY);
  },

  signInAsDevRole(role: AppRole) {
    const devState: DevAuthState = {
      role,
      user: {
        id: `dev-${role}`,
        email: `${role}@dev.local`,
      },
    };
    this.setStoredDevAuth(devState);
  },

  async getUserRole(userId: string, token?: string): Promise<AppRole | null> {
    if (isDevAuthEnabled()) {
      const devAuth = this.getStoredDevAuth();
      if (devAuth?.user.id === userId) {
        return devAuth.role;
      }
    }

    try {
      const role = await api.get<{ role: AppRole }>(`/users/${userId}/role`, {
        ...(token && { token }),
      });
      return role.role;
    } catch {
      return null;
    }
  },
};
