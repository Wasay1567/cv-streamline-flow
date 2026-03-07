import { useEffect, useState } from 'react';
import { backend } from '@/integrations/api/backend';
import type { CVListItem } from '@/integrations/api/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import CVViewDialog from '@/components/CVViewDialog';
import type { CVSubmission } from '@/types/cv';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


const AdvisorDashboard = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<CVListItem[]>([]);
  const [selectedCVId, setSelectedCVId] = useState<string | null>(null);
  const [selectedCVDetails, setSelectedCVDetails] = useState<CVSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [tab, setTab] = useState('all');

  const fetchData = async () => {
    try {
      console.log('Fetching submissions...');
      const subs = await backend.listCVs();
      console.log('Fetched submissions:', subs);
      setSubmissions(Array.isArray(subs) ? subs : []);
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
      setSelectedCVDetails(details);
      setSelectedCVId(cvId);
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
                    <TableCell>
                      <StatusBadge status={sub.cv_status} />
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No submissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedCVId} onOpenChange={() => setSelectedCVId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CV Details</DialogTitle>
          </DialogHeader>
          {selectedCVDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Student Email</p>
                  <p className="text-sm">{(selectedCVDetails as any).student_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <StatusBadge status={(selectedCVDetails as any).status as any} />
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Full CV Data</h3>
                <div className="space-y-3">
                  {Object.entries(selectedCVDetails).map(([key, value]) => (
                    <div key={key} className="border-b pb-2 last:border-b-0">
                      <p className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value) || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
