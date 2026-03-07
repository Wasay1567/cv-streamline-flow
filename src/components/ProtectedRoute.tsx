import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { AppRole } from '@/types/cv';

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireProfileSetup?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, requireProfileSetup = true }: Props) => {
  const { user, role, loading, profileSetupComplete } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // DIL admins do not go through setup-profile.
  if (requireProfileSetup && !profileSetupComplete && role !== 'dil_admin') {
    return <Navigate to="/setup-profile" replace />;
  }

  // If allowedRoles is specified, user MUST have a role and it must be in the list
  if (allowedRoles) {
    if (!role) {
      // User has no role - should not happen for authenticated users, go to setup
      return <Navigate to="/setup-profile" replace />;
    }
    if (!allowedRoles.includes(role)) {
      // User has wrong role for this page
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check passes - render component
  return <>{children}</>;
};

export default ProtectedRoute;
