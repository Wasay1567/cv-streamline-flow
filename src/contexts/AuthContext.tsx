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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut, session } = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!isLoaded) return;

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

          // Check if role is stored in Clerk's metadata (after profile setup)
          const clerkRole = (clerkUser.unsafeMetadata?.role as AppRole) || null;
          const clerkProfileComplete = clerkUser.unsafeMetadata?.profileSetupComplete === true;

          if (clerkRole) {
            setRole(clerkRole);
            setProfileSetupComplete(true);
          } else {
            // Fallback: fetch role from backend if not in Clerk metadata
            const token = await session?.getToken();
            const fetchedRole = await auth.getUserRole(clerkUser.id, token || undefined);
            setRole(fetchedRole);

            // Check if profile setup is complete (stored locally as backup)
            const profileComplete = auth.isProfileSetupComplete();
            setProfileSetupComplete(profileComplete || clerkProfileComplete);
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

    load();
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

