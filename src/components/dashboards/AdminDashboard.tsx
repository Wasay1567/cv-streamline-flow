import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';
import CVViewDialog from '@/components/CVViewDialog';
import type { CVSubmission, CVStatus, Profile, AppRole } from '@/types/cv';
import { DEPARTMENTS, BATCHES } from '@/types/cv';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, BarChart3, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<(CVSubmission & { profiles: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: AppRole }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCV, setSelectedCV] = useState<CVSubmission | null>(null);
  const [tab, setTab] = useState('overview');
  const [roleDialog, setRoleDialog] = useState<{ userId: string; email: string } | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('student');

  const fetchData = async () => {
    const [{ data: profs }, { data: subs }, { data: rls }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('cv_submissions').select('*, profiles!cv_submissions_student_id_fkey(*)'),
      supabase.from('user_roles').select('*'),
    ]);
    setProfiles((profs as Profile[]) || []);
    setSubmissions((subs as any[]) || []);
    setRoles((rls as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleFinalApprove = async (id: string) => {
    await supabase.from('cv_submissions').update({ status: 'approved' }).eq('id', id);
    toast({ title: 'CV approved!' });
    fetchData();
  };

  const handleRoleChange = async () => {
    if (!roleDialog) return;
    // Delete existing role
    await supabase.from('user_roles').delete().eq('user_id', roleDialog.userId);
    // Insert new role
    await supabase.from('user_roles').insert({ user_id: roleDialog.userId, role: newRole });
    toast({ title: 'Role updated', description: `${roleDialog.email} is now ${newRole}` });
    setRoleDialog(null);
    fetchData();
  };

  const deptStats = DEPARTMENTS.map(dept => {
    const deptProfiles = profiles.filter(p => p.department === dept);
    const deptSubs = submissions.filter(s => {
      const p = s.profiles as unknown as Profile;
      return p?.department === dept;
    });
    return { dept, total: deptProfiles.length, submitted: deptSubs.length, approved: deptSubs.filter(s => s.status === 'approved').length };
  });

  const pendingDil = submissions.filter(s => s.status === 'pending_dil');

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DIL Admin Dashboard</h1>
        <p className="text-muted-foreground">Global overview and management</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1"><CheckCircle className="h-4 w-4" /> Pending Approval ({pendingDil.length})</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-4 w-4" /> Role Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{profiles.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{submissions.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{submissions.filter(s => s.status === 'approved').length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending DIL</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{pendingDil.length}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Department Progress</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptStats.map(d => (
                    <TableRow key={d.dept}>
                      <TableCell className="font-medium">{d.dept}</TableCell>
                      <TableCell>{d.total}</TableCell>
                      <TableCell>{d.submitted}</TableCell>
                      <TableCell>{d.approved}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${d.total ? (d.approved / d.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{d.total ? Math.round((d.approved / d.total) * 100) : 0}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDil.map(sub => {
                  const profile = sub.profiles as unknown as Profile;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{profile?.full_name || profile?.email}</TableCell>
                      <TableCell>{profile?.department}</TableCell>
                      <TableCell><StatusBadge status={sub.status as CVStatus} /></TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedCV(sub)}>View</Button>
                        <Button size="sm" className="gap-1" onClick={() => handleFinalApprove(sub.id)}>
                          <CheckCircle className="h-3 w-3" /> Final Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pendingDil.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No pending approvals</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle>User Roles</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => {
                    const userRole = roles.find(r => r.user_id === p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.department || '—'}</TableCell>
                        <TableCell><StatusBadge status={userRole?.role === 'dil_admin' ? 'approved' : userRole?.role === 'advisor' ? 'pending_dil' : 'pending_advisor'} /></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => {
                            setRoleDialog({ userId: p.id, email: p.email });
                            setNewRole((userRole?.role as AppRole) || 'student');
                          }}>Change Role</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CVViewDialog submission={selectedCV} onClose={() => setSelectedCV(null)} />

      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Role for {roleDialog?.email}</DialogTitle></DialogHeader>
          <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="advisor">Advisor</SelectItem>
              <SelectItem value="dil_admin">DIL Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)}>Cancel</Button>
            <Button onClick={handleRoleChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
