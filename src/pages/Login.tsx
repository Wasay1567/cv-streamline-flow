import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { SignIn, useUser } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/integrations/api/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { FileText } from 'lucide-react';

const Login = () => {
  const { isLoaded } = useUser();
  const { user, loading, profileSetupComplete } = useAuth();
  const navigate = useNavigate();
  const devAuthEnabled = auth.isDevAuthEnabled();

  useEffect(() => {
    if (!loading && user) {
      if (!profileSetupComplete) {
        navigate('/setup-profile');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, profileSetupComplete, navigate]);

  if (loading || !isLoaded) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleDevLogin = (role: 'student' | 'advisor' | 'dil_admin') => {
    auth.signInAsDevRole(role);
    window.location.assign('/setup-profile');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Clerk SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full max-w-md',
                card: 'rounded-lg border border-input bg-card shadow-sm',
              },
            }}
            redirectUrl="/setup-profile"
          />
        </div>

        {/* Dev Auth Buttons */}
        {devAuthEnabled && (
          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="text-xs text-muted-foreground text-center">Dev role login</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDevLogin('student')}
                >
                  Student
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDevLogin('advisor')}
                >
                  Advisor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDevLogin('dil_admin')}
                >
                  DIL Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;
