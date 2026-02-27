import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import type { CVSubmission, CVStatus } from '@/types/cv';
import { FileText, Edit } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [submission, setSubmission] = useState<CVSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('cv_submissions')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSubmission(data as unknown as CVSubmission | null);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">Manage your CV submission</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submission Status
            </CardTitle>
            <CardDescription>Current status of your CV</CardDescription>
          </CardHeader>
          <CardContent>
            {submission ? (
              <div className="space-y-3">
                <StatusBadge status={submission.status as CVStatus} />
                {submission.submitted_at && (
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">You haven't started your CV yet.</p>
            )}
          </CardContent>
        </Card>

        {submission?.status === 'rejected' && submission.advisor_comments && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Advisor Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{submission.advisor_comments}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Link to="/cv-form">
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            {submission ? 'Edit CV' : 'Start CV'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
