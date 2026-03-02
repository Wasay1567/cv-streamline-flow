import { useEffect, useState } from 'react';
import { backend } from '@/integrations/api/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import CVViewDialog from '@/components/CVViewDialog';
import type { CVSubmission, CVStatus, Profile } from '@/types/cv';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdvisorDashboard = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<(CVSubmission & { profiles: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCV, setSelectedCV] = useState<CVSubmission | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [tab, setTab] = useState('all');

  const fetchData = async () => {
    try {
      const [profs, subs] = await Promise.all([
        backend.listProfiles(),
        backend.listSubmissions(),
      ]);
      setProfiles(profs || []);
      setSubmissions((subs as any[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    await backend.updateSubmissionStatus(id, 'pending_dil', '');
    toast({ title: 'CV approved and forwarded to DIL admin' });
    fetchData();
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await backend.updateSubmissionStatus(rejectId, 'rejected', rejectComment);
    toast({ title: 'CV rejected', description: 'Student has been notified.' });
    setRejectId(null);
    setRejectComment('');
    fetchData();
  };

  const filtered = submissions.filter(s => {
    if (tab === 'all') return true;
    return s.status === tab;
  });

  // Students without submissions
  const submittedIds = submissions.map(s => s.student_id);
  const notSubmitted = profiles.filter(p => !submittedIds.includes(p.id));

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advisor Dashboard</h1>
        <p className="text-muted-foreground">Review and manage student CV submissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{profiles.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{submissions.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{submissions.filter(s => s.status === 'pending_advisor').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Not Submitted</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{notSubmitted.length}</p></CardContent></Card>
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
                  <TableHead>Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(sub => {
                  const profile = sub.profiles as unknown as Profile;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{profile?.full_name || profile?.email}</TableCell>
                      <TableCell>{profile?.department}</TableCell>
                      <TableCell>{profile?.batch}</TableCell>
                      <TableCell><StatusBadge status={sub.status as CVStatus} /></TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedCV(sub)}>View</Button>
                        {sub.status === 'pending_advisor' && (
                          <>
                            <Button size="sm" className="gap-1" onClick={() => handleApprove(sub.id)}>
                              <CheckCircle className="h-3 w-3" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectId(sub.id)}>
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No submissions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <CVViewDialog submission={selectedCV} onClose={() => setSelectedCV(null)} />

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject CV</DialogTitle></DialogHeader>
          <Textarea placeholder="Enter rejection reason..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvisorDashboard;
