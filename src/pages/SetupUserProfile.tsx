import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import type { AppRole } from '@/types/cv';
import { FileText } from 'lucide-react';
import { DEPARTMENTS } from '@/types/cv';

const departments = DEPARTMENTS

const roles = [
  { value: 'student' as const, label: 'Student' },
  { value: 'advisor' as const, label: 'Advisor' },
  { value: 'dil_admin' as const, label: 'DIL Admin' },
];

export default function SetupUserProfile() {
  const { user, isLoaded } = useUser();
  const { session } = useClerk();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoaded) return null;

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!department || !role) {
      toast({
        title: 'Missing Information',
        description: 'Please select both department and role.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the session token from Clerk
      const token = await session?.getToken({ template: 'default' });
      
      // Send the profile setup to your backend
      await api.post(
        '/users/setup-profile',
        {
          department,
          role,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
        },
        { token: token || '' }
      );

      toast({
        title: 'Success',
        description: 'Your profile has been set up successfully.',
      });

      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set up profile';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Tell us your department and role</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department" className="w-full">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !department || !role}
            >
              {isSubmitting ? 'Setting up...' : 'Continue'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
