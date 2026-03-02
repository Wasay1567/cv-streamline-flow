import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/integrations/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';
import type { AppRole } from '@/types/cv';

const Login = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const devAuthEnabled = auth.isDevAuthEnabled();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await auth.signIn(email, password);
      window.location.assign('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to login';
      toast({ title: 'Login failed', description: message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDevLogin = (role: AppRole) => {
    auth.signInAsDevRole(role);
    window.location.assign('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to CV Automation System</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
            {devAuthEnabled && (
              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground text-center">Dev role login</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDevLogin('student')}>Student</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDevLogin('advisor')}>Advisor</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDevLogin('dil_admin')}>DIL Admin</Button>
                </div>
              </div>
            )}
            <div className="flex justify-between w-full text-sm">
              <Link to="/signup" className="text-primary hover:underline">Create account</Link>
              <Link to="/forgot-password" className="text-muted-foreground hover:underline">Forgot password?</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
