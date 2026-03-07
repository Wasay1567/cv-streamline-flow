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

  // Load auth from Clerk user
  const loadAuth = async () => {
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

        // Get role from Clerk metadata (fast, immediate)
        const clerkRole = (clerkUser.unsafeMetadata?.role as AppRole) || null;
        const clerkProfileComplete = clerkUser.unsafeMetadata?.profileSetupComplete === true;

        // Set role immediately from Clerk metadata if available
        if (clerkRole) {
          setRole(clerkRole);
          setProfileSetupComplete(true);
        } else {
          // No role in Clerk, check localStorage as fallback
          const profileComplete = auth.isProfileSetupComplete();
          setProfileSetupComplete(profileComplete || clerkProfileComplete);
        }

        // Fetch from database in background to get authoritative role (may have been updated by admin)
        const fetchProfileFromDatabase = async () => {
          try {
            const { backend } = await import('@/integrations/api/backend');
            const userProfile = await backend.getUserProfile();
            if (userProfile && userProfile.role) {
              console.log('Updated role from database:', userProfile.role);
              setRole(userProfile.role as AppRole);
              setProfileSetupComplete(true);
            }
          } catch (error) {
            console.warn('Could not fetch user profile from database:', error);
            // Keep using Clerk role if database fetch fails
          }
        };
        
        // Call database fetch without awaiting (background update)
        fetchProfileFromDatabase();
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

