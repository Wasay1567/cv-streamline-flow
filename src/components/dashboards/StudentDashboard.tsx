import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { backend } from '@/integrations/api/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import type { CVStatus } from '@/types/cv';
import { FileText, Edit, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentSubmissionItem {
  id: string;
  status: CVStatus;
  submittedAt: string | null;
  updatedAt: string;
  rejectionComment?: string | null;
  studentImageUrl?: string | null;
}

const normalizeMySubmission = (item: unknown): StudentSubmissionItem | null => {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const id = row.id ?? row.cv_id;
  if (typeof id !== 'string' || !id) return null;

  const status = (row.status ?? row.cv_status ?? 'not_submitted') as CVStatus;
  const submittedAt = (row.submitted_at ?? row.created_at ?? null) as string | null;
  const updatedAt = String(row.updated_at ?? row.created_at ?? '');
  const rejectionComment = (row.rejection_comment ?? row.advisor_comments ?? null) as string | null;

  const cvData = (row.cv_data as Record<string, unknown> | undefined) || {};
  const studentImageUrl =
    (cvData.student_image as string | undefined) ||
    (cvData.student_image_url as string | undefined) ||
    (row.student_image_url as string | undefined) ||
    null;

  return { id, status, submittedAt, updatedAt, rejectionComment, studentImageUrl };
};

const StudentDashboard = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [submission, setSubmission] = useState<StudentSubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMySubmission = async () => {
    if (!user || role !== 'student') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const raw = await backend.getMyCVs();
      const rows = Array.isArray(raw) ? raw : [];
      const normalized = rows
        .map(normalizeMySubmission)
        .filter(Boolean) as StudentSubmissionItem[];

      // Even though there is only one valid submission now, 
      // we sort by date just in case the backend returns a legacy array, 
      // and we strictly only care about the first (latest) one.
      normalized.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setSubmission(normalized[0] || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load your submission';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubmission();
  }, [user, role]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e2a5e]">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your CV submission and track its approval status.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* --- CURRENT CV STATUS CARD --- */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
              <FileText className="h-5 w-5 text-blue-600" />
              My CV Status
            </CardTitle>
            <CardDescription>The current state of your official profile</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {submission ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">Status:</span>
                  <StatusBadge status={submission.status} />
                </div>
                {submission.updatedAt && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-500">Last Updated:</span>{' '}
                    {new Date(submission.updatedAt).toLocaleString()}
                  </p>
                )}
                {submission.submittedAt && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-500">Submitted On:</span>{' '}
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-slate-500 mb-4">You haven't created your CV yet.</p>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link to="/cv-form">
                <Button className="w-full gap-2 bg-[#1e2a5e] hover:bg-blue-900">
                  <Edit className="h-4 w-4" />
                  {submission ? 'Edit / Update CV' : 'Start Creating CV'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* --- DEADLINE PLACEHOLDER CARD --- */}
        <Card className="shadow-md border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
              <Clock className="h-5 w-5 text-amber-600" />
              Upcoming Deadline
            </CardTitle>
            <CardDescription>Submission timeline for your batch</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Deadline TBA</p>
                <p className="text-sm text-slate-500 mt-1 max-w-[250px]">
                  The Directorate of Industrial Liaison has not yet announced the final submission deadline for your department.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- ADVISOR FEEDBACK CARD (Conditionally Rendered) --- */}
      {submission?.status === 'rejected' && submission.rejectionComment && (
        <Card className="border-destructive/50 shadow-md bg-red-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Revisions Required
            </CardTitle>
            <CardDescription className="text-red-900/70">
              Your Class Advisor has requested changes to your CV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-md border border-red-100 text-slate-800 text-sm leading-relaxed shadow-sm">
              {submission.rejectionComment}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;