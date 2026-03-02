import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppRole } from '@/types/cv';
import { auth, type AuthUser, type Session } from '@/integrations/api/auth';

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, role: null, loading: true, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const userRole = await auth.getUserRole(userId);
    setRole(userRole);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { session: currentSession, user: currentUser } = await auth.getSession();
        setSession(currentSession);
        setUser(currentUser);
        if (currentUser) {
          await fetchRole(currentUser.id);
        } else {
          setRole(null);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
