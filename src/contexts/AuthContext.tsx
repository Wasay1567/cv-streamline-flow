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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  profileSetupComplete: false,
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

          // Check if profile setup is complete (stored locally)
          const profileComplete = auth.isProfileSetupComplete();
          setProfileSetupComplete(profileComplete);
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
  }, [clerkUser, isLoaded]);

  const signOut = async () => {
    try {
      if (auth.isDevAuthEnabled()) {
        auth.setStoredDevAuth(null);
      }
      auth.clearProfileSetup();
      await clerkSignOut?.();
      setUser(null);
      setRole(null);
      setProfileSetupComplete(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, profileSetupComplete, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

