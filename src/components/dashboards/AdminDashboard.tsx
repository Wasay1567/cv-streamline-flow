import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import CVViewDialog from '@/components/CVViewDialog';
import type { CVSubmission, CVStatus, CVData, Profile, AppRole } from '@/types/cv';
import { DEPARTMENTS, BATCHES } from '@/types/cv';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, BarChart3, Shield, Search, Mail, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<(CVSubmission & { profiles: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: AppRole }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCV, setSelectedCV] = useState<CVSubmission | null>(null);
  const [tab, setTab] = useState('overview');

  // User search
  const [userSearch, setUserSearch] = useState('');

  // Role dialog
  const [roleDialog, setRoleDialog] = useState<{ userId: string; email: string } | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('student');

  // CV filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [skillSearch, setSkillSearch] = useState('');
  const [minInternships, setMinInternships] = useState('');

  // Bulk notify
  const [notifyDialog, setNotifyDialog] = useState(false);
  const [notifySubject, setNotifySubject] = useState('Reminder: Submit Your CV');
  const [notifyBody, setNotifyBody] = useState('Dear Student,\n\nThis is a reminder to submit your CV as soon as possible.\n\nRegards,\nDIL Admin');
  const [notifyDeadline, setNotifyDeadline] = useState('');
  const [notifySending, setNotifySending] = useState(false);

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
    await supabase.from('user_roles').delete().eq('user_id', roleDialog.userId);
    await supabase.from('user_roles').insert({ user_id: roleDialog.userId, role: newRole });
    toast({ title: 'Role updated', description: `${roleDialog.email} is now ${newRole}` });
    setRoleDialog(null);
    fetchData();
  };

  const handleBulkNotify = async () => {
    setNotifySending(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-notify', {
        body: {
          subject: notifySubject,
          body: notifyBody,
          deadline: notifyDeadline || undefined,
        },
      });
      if (error) throw error;
      toast({ title: 'Notifications sent!', description: `Emailed ${data?.sent || 0} students.` });
      setNotifyDialog(false);
    } catch (err: any) {
      toast({ title: 'Error sending notifications', description: err.message, variant: 'destructive' });
    }
    setNotifySending(false);
  };

  // Stats
  const deptStats = DEPARTMENTS.map(dept => {
    const deptProfiles = profiles.filter(p => p.department === dept);
    const deptSubs = submissions.filter(s => {
      const p = s.profiles as unknown as Profile;
      return p?.department === dept;
    });
    return { dept, total: deptProfiles.length, submitted: deptSubs.length, approved: deptSubs.filter(s => s.status === 'approved').length };
  });

  const pendingDil = submissions.filter(s => s.status === 'pending_dil');

  // Filtered users
  const filteredUsers = profiles.filter(p => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return p.email.toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q);
  });

  // Filtered CVs
  const filteredCVs = submissions.filter(sub => {
    const profile = sub.profiles as unknown as Profile;
    const cv = sub.cv_data as CVData;
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (deptFilter !== 'all' && profile?.department !== deptFilter) return false;
    if (batchFilter !== 'all' && profile?.batch !== batchFilter) return false;
    if (skillSearch) {
      const skills = cv?.skills || [];
      if (!skills.some(s => s.toLowerCase().includes(skillSearch.toLowerCase()))) return false;
    }
    if (minInternships && Number(minInternships) > 0) {
      const count = cv?.internships?.length || 0;
      if (count < Number(minInternships)) return false;
    }
    return true;
  });

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DIL Admin Dashboard</h1>
          <p className="text-muted-foreground">Global overview and management</p>
        </div>
        <Button onClick={() => setNotifyDialog(true)} className="gap-2">
          <Mail className="h-4 w-4" /> Bulk Notify Students
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="cvs" className="gap-1"><Filter className="h-4 w-4" /> CV Submissions ({submissions.length})</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1"><CheckCircle className="h-4 w-4" /> Pending ({pendingDil.length})</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-4 w-4" /> Roles</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
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
                    <TableHead>Department</TableHead><TableHead>Students</TableHead><TableHead>Submitted</TableHead><TableHead>Approved</TableHead><TableHead>Progress</TableHead>
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

        {/* CV Submissions with Advanced Filters */}
        <TabsContent value="cvs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      <SelectItem value="pending_advisor">Pending Advisor</SelectItem>
                      <SelectItem value="pending_dil">Pending DIL</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Batch</Label>
                  <Select value={batchFilter} onValueChange={setBatchFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {BATCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Skill</Label>
                  <Input placeholder="e.g. React" value={skillSearch} onChange={e => setSkillSearch(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min Internships</Label>
                  <Input type="number" min="0" placeholder="0" value={minInternships} onChange={e => setMinInternships(e.target.value)} />
                </div>
              </div>
              {(statusFilter !== 'all' || deptFilter !== 'all' || batchFilter !== 'all' || skillSearch || minInternships) && (
                <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => { setStatusFilter('all'); setDeptFilter('all'); setBatchFilter('all'); setSkillSearch(''); setMinInternships(''); }}>
                  <X className="h-3 w-3" /> Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Internships</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCVs.map(sub => {
                    const profile = sub.profiles as unknown as Profile;
                    const cv = sub.cv_data as CVData;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{profile?.full_name || profile?.email}</TableCell>
                        <TableCell>{profile?.department}</TableCell>
                        <TableCell>{profile?.batch}</TableCell>
                        <TableCell><StatusBadge status={sub.status as CVStatus} /></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(cv?.skills || []).slice(0, 3).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                            {(cv?.skills?.length || 0) > 3 && <Badge variant="outline" className="text-xs">+{cv.skills.length - 3}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{cv?.internships?.length || 0}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedCV(sub)}>View</Button>
                          {sub.status === 'pending_dil' && (
                            <Button size="sm" className="gap-1" onClick={() => handleFinalApprove(sub.id)}>
                              <CheckCircle className="h-3 w-3" /> Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCVs.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No CVs match filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by email or name..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="max-w-sm" />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(p => {
                    const userRole = roles.find(r => r.user_id === p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.department || '—'}</TableCell>
                        <TableCell>{p.batch || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={userRole?.role === 'dil_admin' ? 'default' : userRole?.role === 'advisor' ? 'secondary' : 'outline'}>
                            {userRole?.role || 'student'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => {
                            setRoleDialog({ userId: p.id, email: p.email });
                            setNewRole((userRole?.role as AppRole) || 'student');
                          }}>Change Role</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle>Role Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                {(['student', 'advisor', 'dil_admin'] as AppRole[]).map(r => (
                  <Card key={r}>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold">{roles.filter(rl => rl.role === r).length}</p>
                      <p className="text-sm text-muted-foreground capitalize">{r.replace('_', ' ')}s</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CVViewDialog submission={selectedCV} onClose={() => setSelectedCV(null)} />

      {/* Role Change Dialog */}
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

      {/* Bulk Notify Dialog */}
      <Dialog open={notifyDialog} onOpenChange={setNotifyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bulk Notify Students</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send an email reminder to all students who have not yet submitted their CV.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={notifySubject} onChange={e => setNotifySubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <Textarea value={notifyBody} onChange={e => setNotifyBody(e.target.value)} rows={6} />
            </div>
            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <Input type="date" value={notifyDeadline} onChange={e => setNotifyDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkNotify} disabled={notifySending} className="gap-2">
              <Mail className="h-4 w-4" /> {notifySending ? 'Sending...' : 'Send Notifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
