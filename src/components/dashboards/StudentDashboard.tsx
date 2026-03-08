import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { backend } from '@/integrations/api/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import type { CVStatus } from '@/types/cv';
import { FileText, Edit, Trash2 } from 'lucide-react';
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
  const [submissions, setSubmissions] = useState<StudentSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMySubmissions = async () => {
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

      normalized.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setSubmissions(normalized);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load your submissions';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubmissions();
  }, [user, role]);

  const latestSubmission = useMemo(() => submissions[0] || null, [submissions]);

  const deleteImageFromDrive = async (studentImageUrl: string) => {
    if (!studentImageUrl) return;
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) return;

    try {
      // console.log('[StudentDashboard] deleteImageFromDrive input URL:', studentImageUrl);
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', fileUrl: studentImageUrl }),
      });
      const raw = await response.text();
      // console.log('[StudentDashboard] deleteImageFromDrive raw response:', raw);
    } catch (error) {
      // console.error('Failed to delete image from Drive:', error);
    }
  };

  

  // console.log(submissions)
  const handleDelete = async (submissionId: string) => {
    if (!latestSubmission) return;
    if (submissionId === latestSubmission.id) {
      toast({ title: 'Not allowed', description: 'You cannot delete your latest submission.', variant: 'destructive' });
      return;
    }
    

    setDeletingId(submissionId);
    try {
      const row = submissions.find((s) => s.id === submissionId);
      // console.log('[StudentDashboard] deleting row:', row);
      let imageUrl = row?.studentImageUrl || null;

      if (!imageUrl) {
        try {
          const details = await backend.getCV(submissionId);
          // console.log('[StudentDashboard] getCV details for delete:', details);
          imageUrl = details?.cv_data?.student_image || null;
        } catch {
          imageUrl = null;
        }
      }

      // console.log('[StudentDashboard] resolved imageUrl before deleteCV:', imageUrl);
      if (imageUrl) {
        await deleteImageFromDrive(imageUrl);
      }

      await backend.deleteCV(submissionId);
      toast({ title: 'Deleted', description: 'Submission deleted successfully.' });
      await fetchMySubmissions();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete submission';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">Manage your CV submissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Latest Submission
            </CardTitle>
            <CardDescription>Current status of your most recent CV</CardDescription>
          </CardHeader>
          <CardContent>
            {latestSubmission ? (
              <div className="space-y-3">
                <StatusBadge status={latestSubmission.status} />
                {latestSubmission.submittedAt && (
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(latestSubmission.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">You haven't started your CV yet.</p>
            )}
          </CardContent>
        </Card>

        {latestSubmission?.status === 'rejected' && latestSubmission.rejectionComment && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Advisor Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{latestSubmission.rejectionComment}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Submissions</CardTitle>
          <CardDescription>You can delete older submissions. Latest submission cannot be deleted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions found.</p>
          ) : (
            submissions.map((item) => {
              const isLatest = latestSubmission?.id === item.id;
              return (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Submission #{item.id.slice(0, 8)}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">
                        Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}
                      </span>
                      {isLatest && <span className="text-xs text-primary font-medium">(Latest)</span>}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isLatest || deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link to="/cv-form">
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            {latestSubmission ? 'Edit CV' : 'Start CV'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
