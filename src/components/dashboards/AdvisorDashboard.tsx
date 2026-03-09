import { useEffect, useState } from 'react';
import { backend } from '@/integrations/api/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import CVViewDialog from '@/components/CVViewDialog';
import type { CVSubmission, CVData, CVStatus } from '@/types/cv';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface AdvisorSubmissionRow {
  cv_id: string;
  student_email: string;
  department: string;
  batch: string;
  cgpa: string;
  internships_count: number;
  cv_status: string;
}

const normalizeAdvisorSubmission = (item: unknown): AdvisorSubmissionRow | null => {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const summary = (row.summary as Record<string, unknown> | undefined) || {};
  const personal = (row.personal_info as Record<string, unknown> | undefined) || {};
  const academics = Array.isArray(row.academics) ? (row.academics as Record<string, unknown>[]) : [];
  const internships = Array.isArray(row.internships) ? row.internships : [];

  const cvId = String(row.cv_id ?? summary.cv_id ?? row.id ?? '');
  if (!cvId) return null;

  return {
    cv_id: cvId,
    student_email: String(row.student_email ?? summary.student_email ?? ''),
    department: String(summary.department ?? personal.department ?? ''),
    batch: String(summary.batch ?? personal.batch ?? ''),
    cgpa: String(summary.cgpa ?? academics[0]?.gpa ?? '-'),
    internships_count: Number(summary.internships_count ?? internships.length ?? 0),
    cv_status: String(row.status ?? row.cv_status ?? summary.cv_status ?? 'not_submitted'),
  };
};

const toStringArray = (value: unknown, key: string): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const v = (item as Record<string, unknown>)[key];
        return typeof v === 'string' ? v : '';
      }
      return '';
    })
    .filter(Boolean);
};

const mapApiCvDataToFrontend = (row: Record<string, unknown>): CVData => {
  const personal = (row.personal_info as Record<string, unknown> | undefined) || {};
  const internships = Array.isArray(row.internships) ? (row.internships as Record<string, unknown>[]) : [];
  const visits = Array.isArray(row.industrial_visits) ? (row.industrial_visits as Record<string, unknown>[]) : [];
  const academics = Array.isArray(row.academics) ? (row.academics as Record<string, unknown>[]) : [];

  return {
    student_image: String(row.student_image ?? row.student_image_url ?? ''),
    personalInfo: {
      name: String(personal.name ?? ''),
      fatherName: String(personal.father_name ?? ''),
      department: String(personal.department ?? ''),
      batch: String(personal.batch ?? ''),
      cell: String(personal.cell ?? ''),
      rollNo: String(personal.roll_no ?? ''),
      cnic: String(personal.cnic ?? ''),
      email: String(personal.email ?? ''),
      gender: String(personal.gender ?? 'Male') as 'Male' | 'Female' | 'Other',
      dob: String(personal.dob ?? ''),
      address: String(personal.address ?? ''),
    },
    academics: academics.map((a) => ({
      degree: String(a.degree ?? ''),
      university: String(a.university ?? ''),
      from_date: String(a.from_date ?? a.from ?? a.year ?? ''),
      to_date: String(a.to_date ?? a.to ?? ''),
      gpa: Number.isFinite(Number(a.gpa)) ? Number(a.gpa) : Number.NaN,
      majors: String(a.majors ?? ''),
    })),
    fyp: {
      title: String((row.fyp as Record<string, unknown> | undefined)?.title ?? ''),
      company: String((row.fyp as Record<string, unknown> | undefined)?.company ?? ''),
      objectives: String((row.fyp as Record<string, unknown> | undefined)?.objectives ?? ''),
    },
    careerCounseling: Boolean(row.career_counseling),
    internships: internships.map((i) => ({
      organization: String(i.organization ?? ''),
      position: String(i.position ?? ''),
      field: String(i.field ?? ''),
      from: String(i.from_date ?? i.from ?? ''),
      to: String(i.to_date ?? i.to ?? ''),
    })),
    industrialVisits: visits.map((v) => ({
      organization: String(v.organization ?? ''),
      purpose: String(v.purpose ?? ''),
      date: String(v.visit_date ?? v.date ?? ''),
    })),
    certificates: toStringArray(row.certificates, 'name'),
    achievements: toStringArray(row.achievements, 'description'),
    skills: toStringArray(row.skills, 'name'),
    extraCurricular: toStringArray(row.extra_curricular, 'activity'),
    references: Array.isArray(row.references)
      ? (row.references as Record<string, unknown>[]).map((r) => ({
          name: String(r.name ?? ''),
          contact: String(r.contact ?? ''),
          occupation: String(r.occupation ?? ''),
          relation: String(r.relation ?? ''),
        }))
      : [],
  };
};

const normalizeCvDetails = (input: unknown): CVSubmission | null => {
  if (!input || typeof input !== 'object') return null;
  const row = input as Record<string, unknown>;
  const id = String(row.cv_id ?? row.id ?? '');
  if (!id) return null;

  return {
    id,
    student_id: String(row.student_id ?? ''),
    status: String(row.status ?? row.cv_status ?? 'not_submitted') as CVStatus,
    cv_data: mapApiCvDataToFrontend(row),
    rejection_comment: String(row.rejection_comment ?? ''),
    submitted_at: (row.submitted_at ?? row.created_at ?? null) as string | null,
    updated_at: String(row.updated_at ?? ''),
  };
};

const AdvisorDashboard = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<AdvisorSubmissionRow[]>([]);
  const [selectedCV, setSelectedCV] = useState<CVSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [tab, setTab] = useState('all');

  const fetchData = async () => {
    try {
      console.log('Fetching submissions...');
      const subs = await backend.listCVs();
      console.log('Fetched submissions:', subs);
      const normalized = Array.isArray(subs)
        ? subs.map(normalizeAdvisorSubmission).filter(Boolean) as AdvisorSubmissionRow[]
        : [];
      setSubmissions(normalized);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      const message = error instanceof Error ? error.message : 'Failed to load submissions';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewCV = async (cvId: string) => {
    try {
      const details = await backend.getCV(cvId);
      const normalized = normalizeCvDetails(details);
      setSelectedCV(normalized || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load CV details';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (cvId: string) => {
    try {
      await backend.approveCV(cvId);
      toast({ title: 'Success', description: 'CV approved and forwarded to DIL admin' });
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve CV';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // backend.getUserProfile();

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await backend.rejectCV(rejectId, rejectComment);
      toast({ title: 'Success', description: 'CV rejected successfully' });
      setRejectId(null);
      setRejectComment('');
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject CV';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const filtered = submissions.filter(s => {
    if (tab === 'all') return true;
    if (tab === 'pending_advisor') {
      // Show pending_advisor AND any unknown/unrecognized statuses
      const knownStatuses = ['pending_advisor', 'pending_dil', 'approved', 'rejected'];
      return s.cv_status === tab || !knownStatuses.includes(s.cv_status);
    }
    return s.cv_status === tab;
  });

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advisor Dashboard</h1>
        <p className="text-muted-foreground">Review and manage student CV submissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{submissions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{submissions.filter(s => s.cv_status !== 'approved' && s.cv_status !== 'rejected').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{submissions.filter(s => s.cv_status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{submissions.filter(s => s.cv_status === 'rejected').length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending_advisor">Pending</TabsTrigger>
          <TabsTrigger value="pending_dil">Forwarded</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Internships</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(sub => (
                  <TableRow key={sub.cv_id}>
                    <TableCell className="font-medium">{sub.student_email}</TableCell>
                    <TableCell>{sub.department}</TableCell>
                    <TableCell>{sub.batch}</TableCell>
                    <TableCell>{sub.cgpa}</TableCell>
                    <TableCell>{sub.internships_count}</TableCell>
                    <TableCell>
                      <StatusBadge status={sub.cv_status as any} />
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewCV(sub.cv_id)}>
                        View
                      </Button>
                      {sub.cv_status !== 'approved' && sub.cv_status !== 'rejected' && (
                        <>
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => handleApprove(sub.cv_id)}
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => setRejectId(sub.cv_id)}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No submissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <CVViewDialog submission={selectedCV} onClose={() => setSelectedCV(null)}/>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject CV</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvisorDashboard;
