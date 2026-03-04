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

  // Check if profile setup is required and not completed
  if (requireProfileSetup && !profileSetupComplete) {
    return <Navigate to="/setup-profile" replace />;
  }

  // Check role-based access
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Allow setup route for logged-in users without full protection
  if (!requireProfileSetup) {
    return <>{children}</>;
  }

  // Require role if role-based access is specified
  if (allowedRoles && !role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
