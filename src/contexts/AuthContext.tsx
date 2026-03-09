import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import type { AppRole } from '@/types/cv';
import type { AuthUser } from '@/integrations/api/auth';
import { auth } from '@/integrations/api/auth';

interface AuthContextType {
  user: AuthUser | null;
  role: AppRole | null;
  loading: boolean;
  profileSetupComplete: boolean;
  setProfileSetupComplete: (complete: boolean) => void;
  setUserRole: (role: AppRole | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  profileSetupComplete: false,
  setProfileSetupComplete: () => {},
  setUserRole: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const normalizeRole = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'student') return 'student';
  if (normalized === 'advisor') return 'advisor';
  if (normalized === 'dil_admin' || normalized === 'dil-admin' || normalized === 'dil admin' || normalized === 'diladmin' || normalized === 'admin') {
    return 'dil_admin';
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut, session } = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);

  // Load auth from Clerk user
  const loadAuth = async () => {
    try {
      // Check if dev auth is active
      if (auth.isDevAuthEnabled()) {
        const devAuth = auth.getStoredDevAuth();
        if (devAuth) {
          setUser(devAuth.user);
          setRole(devAuth.role);
          setProfileSetupComplete(true);
          setLoading(false);
          return;
        }
      }

      // Use Clerk user
      if (clerkUser) {
        const authUser: AuthUser = {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          firstName: clerkUser.firstName || undefined,
          lastName: clerkUser.lastName || undefined,
        };
        setUser(authUser);

        // Get role/setup hints from Clerk metadata (fallback only)
        const clerkRole = normalizeRole(clerkUser.unsafeMetadata?.role);
        const clerkProfileComplete = clerkUser.unsafeMetadata?.profileSetupComplete === true;
        // Resolve authoritative role before leaving loading state to avoid mounting the wrong dashboard.
        try {
          const { backend } = await import('@/integrations/api/backend');
          const token = await session?.getToken();
          const userProfile = await backend.getUserProfile(token || undefined);
          if (userProfile) {
            // Some backends omit role on /profiles; use Clerk role as fallback.
            const profileRole = normalizeRole(userProfile.role);
            const resolvedRole = profileRole || clerkRole;
            const hasDepartment = typeof userProfile.department === 'string' && userProfile.department.trim().length > 0;
            const isDilAdmin = resolvedRole === 'dil_admin';

            setRole(resolvedRole);
            // Student/advisor setup is complete only when role + department exist.
            // DIL admin bypasses setup-profile.
            setProfileSetupComplete(isDilAdmin || (!!resolvedRole && hasDepartment));
          } else {
            setRole(clerkRole);
            setProfileSetupComplete(clerkProfileComplete || false);
          }
        } catch (error) {
          console.warn('Could not fetch user profile from database; falling back to Clerk metadata:', error);
          setRole(clerkRole);
          setProfileSetupComplete(clerkProfileComplete || false);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfileSetupComplete(false);
      }
    } catch (error) {
      console.error('Auth load error:', error);
      setUser(null);
      setRole(null);
      setProfileSetupComplete(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }
    loadAuth();
  }, [clerkUser, isLoaded, session]);

  const signOut = async () => {
    try {
      if (auth.isDevAuthEnabled()) {
        auth.setStoredDevAuth(null);
      }
      auth.clearProfileSetup();
      // Don't clear Clerk metadata - keep role/department persistent
      // so user doesn't need to set up profile again on next sign in
      await clerkSignOut?.();
      setUser(null);
      setRole(null);
      setProfileSetupComplete(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSetProfileSetupComplete = (complete: boolean) => {
    auth.setProfileSetupComplete(complete);
    setProfileSetupComplete(complete);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        profileSetupComplete,
        setProfileSetupComplete: handleSetProfileSetupComplete,
        setUserRole: setRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
