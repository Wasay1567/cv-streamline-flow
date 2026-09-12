import { useEffect, useState } from 'react';
import { backend } from '@/integrations/api/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import CVViewDialog from '@/components/CVViewDialog';
import type { CVSubmission, CVStatus, CVData, Profile } from '@/types/cv';
import { DEPARTMENTS, BATCHES } from '@/types/cv';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, BarChart3, Mail, Filter, X, HardDriveDownload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const toDatetimeLocal = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
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

const normalizeAdminSubmission = (input: unknown): (CVSubmission & { profiles: Profile }) | null => {
  if (!input || typeof input !== 'object') return null;
  const row = input as Record<string, unknown>;
  const summary = (row.summary as Record<string, unknown> | undefined) || {};
  const personal = (row.personal_info as Record<string, unknown> | undefined) || {};

  const id = String(row.cv_id ?? row.id ?? '');
  if (!id) return null;

  return {
    id,
    student_id: String(row.student_id ?? row.student_email ?? ''),
    status: String(row.status ?? row.cv_status ?? summary.cv_status ?? 'not_submitted') as CVStatus,
    cv_data: mapApiCvDataToFrontend(row),
    rejection_comment: String(row.rejection_comment ?? ''),
    submitted_at: (row.submitted_at ?? row.created_at ?? null) as string | null,
    updated_at: String(row.updated_at ?? ''),
    profiles: {
      id: String(row.student_id ?? ''),
      email: String(row.student_email ?? summary.student_email ?? ''),
      full_name: String(personal.name ?? ''),
      department: String(summary.department ?? personal.department ?? ''),
      batch: String(summary.batch ?? personal.batch ?? ''),
    },
  };
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<(CVSubmission & { profiles: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingAdvisors, setPendingAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCV, setSelectedCV] = useState<CVSubmission | null>(null);
  const [tab, setTab] = useState('overview');

  // CV filters
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [skillSearch, setSkillSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [minInternships, setMinInternships] = useState('');
  const [sortByCGPA, setSortByCGPA] = useState(false);

  // Bulk notify
  const [notifyDialog, setNotifyDialog] = useState(false);
  const [notifySubject, setNotifySubject] = useState('Reminder: Submit Your CV');
  const [notifyBody, setNotifyBody] = useState('Dear Student,\n\nThis is a reminder to submit your CV as soon as possible.\n\nRegards,\nDIL Admin');
  const [notifyDeadline, setNotifyDeadline] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [currentDeadline, setCurrentDeadline] = useState<string | null>(null);
  const [deadlineSaving, setDeadlineSaving] = useState(false);

  //download loading
  const [downloading, setDownloading] = useState(false)

  const fetchData = async () => {
    try {
      const [subs, advisors] = await Promise.all([
        backend.listCVs(),
        // backend.listUserRoles(),
        backend.getPendingAdvisors(),
      ]);
      const formattedSubs = Array.isArray(subs)
        ? subs.map(normalizeAdminSubmission).filter(Boolean) as (CVSubmission & { profiles: Profile })[]
        : [];
      
      setSubmissions(formattedSubs);
      // setRoles(Array.isArray(rls) ? rls : []);
      setPendingAdvisors(Array.isArray(advisors) ? advisors : []);
      setProfiles([]); // No longer available from API
      const deadline = await backend.getDeadline();
      const configuredDeadline = deadline.configured ? deadline.deadline : null;
      setCurrentDeadline(configuredDeadline);
      setDeadlineValue(configuredDeadline ? toDatetimeLocal(configuredDeadline) : '');
    } catch (error) {
      console.error('Error fetching admin data:', error);
      const message = error instanceof Error ? error.message : 'Failed to load data';
      toast({
        title: 'Error loading dashboard',
        description: message,
        variant: 'destructive',
      });
      setSubmissions([]);
      setPendingAdvisors([]);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveDeadline = async () => {
    if (!deadlineValue) {
      toast({ title: 'Deadline required', description: 'Choose a date and time for the deadline.', variant: 'destructive' });
      return;
    }

    const deadline = new Date(deadlineValue);
    if (Number.isNaN(deadline.getTime())) {
      toast({ title: 'Invalid deadline', description: 'Choose a valid date and time.', variant: 'destructive' });
      return;
    }

    setDeadlineSaving(true);
    try {
      const response = await backend.saveDeadline(deadline.toISOString());
      setCurrentDeadline(response.deadline);
      setDeadlineValue(response.deadline ? toDatetimeLocal(response.deadline) : deadlineValue);
      toast({
        title: 'Deadline saved',
        description: `Notified ${response.notified_count ?? 0} students who have not submitted a CV.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save deadline';
      toast({ title: 'Error saving deadline', description: message, variant: 'destructive' });
    } finally {
      setDeadlineSaving(false);
    }
  };

  const handleFinalApprove = async (id: string) => {
    try {
      await backend.approveCV(id);
      toast({ title: 'CV approved!' });
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve CV';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleViewCV = async (cvId: string) => {
    try {
      const details = await backend.getCV(cvId);
      const normalized = normalizeAdminSubmission(details);
      setSelectedCV(normalized || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load CV details';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleBulkNotify = async () => {
    setNotifySending(true);
    try {
      const data = await backend.bulkNotifyStudents({
        subject: notifySubject,
        body: notifyBody,
        deadline: notifyDeadline || undefined,
      });
      toast({ title: 'Notifications sent!', description: `Emailed ${data.notified_count} students.` });
      setNotifyDialog(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send notifications';
      toast({ title: 'Error sending notifications', description: message, variant: 'destructive' });
    }
    setNotifySending(false);
  };

  const handleDownloadCVs = async () => {
    if (approvedFilteredCVs.length === 0) {
      toast({
        title: 'No approved CVs',
        description: 'Please filter to show at least one approved CV before downloading.',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    try {
      const data = await backend.downloadCVs(cvIdsToDownload);
      // Handle zip file download
      const blob = new Blob([data as ArrayBuffer], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv_submissions_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Download started',
        description: `Downloading ${approvedFilteredCVs.length} approved CV(s)...`,
      });
      console.log(`Initiated download for CV IDs: ${cvIdsToDownload.join(', ')}`);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download CVs';
      toast({
        title: 'Error downloading CVs',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleApproveAdvisor = async (advisorId: string) => {
    try {
      await backend.approveAdvisor(advisorId);
      toast({ title: 'Advisor approved!', description: 'The advisor has been activated.' });
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve advisor';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleRejectAdvisor = async (advisorId: string) => {
    try {
      await backend.rejectAdvisor(advisorId);
      toast({ title: 'Advisor rejected', description: 'The pending advisor request has been rejected.' });
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject advisor';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
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

  // Filtered CVs
  const filteredCVs = submissions.filter(sub => {
    const profile = sub.profiles as unknown as Profile;
    const cv = sub.cv_data as CVData;
    if (deptFilter !== 'all' && profile?.department !== deptFilter) return false;
    if (batchFilter !== 'all' && profile?.batch !== batchFilter) return false;
    if (emailSearch && !profile?.email?.toLowerCase().includes(emailSearch.toLowerCase())) return false;
    if (skillSearch) {
      const skills = cv?.skills || [];
      if (!skills.some(s => s.toLowerCase().includes(skillSearch.toLowerCase()))) return false;
    }
    if (minInternships && Number(minInternships) > 0) {
      const count = cv?.internships?.length || 0;
      if (count < Number(minInternships)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortByCGPA) {
      const cvA = a.cv_data as CVData;
      const cvB = b.cv_data as CVData;
      const cgpaA = Number(cvA?.academics?.[0]?.gpa ?? 0);
      const cgpaB = Number(cvB?.academics?.[0]?.gpa ?? 0);
      return cgpaB - cgpaA; // Descending order
    }
    return 0;
  });

  // Get approved CVs from filtered results
  const approvedFilteredCVs = filteredCVs.filter(sub => sub.status === 'approved');
  const cvIdsToDownload = approvedFilteredCVs.map(sub => sub.id);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DIL Admin Dashboard</h1>
          <p className="text-muted-foreground">Global overview and management</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadCVs}
            disabled={approvedFilteredCVs.length === 0 || downloading}
            className="gap-2"
            title={approvedFilteredCVs.length === 0 ? 'Filter for at least one approved CV to enable download' : ''}
          >
            <HardDriveDownload className="h-4 w-4" />
            {downloading ? 'Downloading...' : `Download CV(s) (${approvedFilteredCVs.length})`}
          </Button>
          <Button onClick={() => setNotifyDialog(true)} className="gap-2">
            <Mail className="h-4 w-4" /> Bulk Notify Students
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>CV Submission Deadline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="cv-deadline">Deadline date and time</Label>
              <Input id="cv-deadline" type="datetime-local" value={deadlineValue} onChange={e => setDeadlineValue(e.target.value)} />
              {currentDeadline && (
                <p className="text-xs text-muted-foreground">Current deadline: {new Date(currentDeadline).toLocaleString()}</p>
              )}
            </div>
            <Button onClick={handleSaveDeadline} disabled={deadlineSaving}>
              {deadlineSaving ? 'Saving...' : 'Save Deadline'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="cvs" className="gap-1"><Filter className="h-4 w-4" /> CV Submissions ({submissions.length})</TabsTrigger>
          <TabsTrigger value="advisors" className="gap-1"><Users className="h-4 w-4" /> Pending Advisors ({pendingAdvisors.length})</TabsTrigger>
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
              <div className="grid gap-3 md:grid-cols-6">
                <div className="space-y-1">
                  <Label className="text-xs">Student Email</Label>
                  <Input placeholder="search@email.com" value={emailSearch} onChange={e => setEmailSearch(e.target.value)} />
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
                <div className="space-y-1 flex items-end">
                  <div className="flex items-center gap-2">
                    <Checkbox id="sort-cgpa" checked={sortByCGPA} onCheckedChange={(checked) => setSortByCGPA(checked as boolean)} />
                    <Label htmlFor="sort-cgpa" className="text-xs cursor-pointer">Sort by CGPA</Label>
                  </div>
                </div>
              </div>
              {(deptFilter !== 'all' || batchFilter !== 'all' || emailSearch || skillSearch || minInternships || sortByCGPA) && (
                <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => { setDeptFilter('all'); setBatchFilter('all'); setEmailSearch(''); setSkillSearch(''); setMinInternships(''); setSortByCGPA(false); }}>
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
                    <TableHead>CGPA</TableHead>
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
                        <TableCell className="font-semibold">
                          {Number.isFinite(cv?.academics?.[0]?.gpa) ? cv.academics[0].gpa : 'â€”'}
                        </TableCell>
                        <TableCell>{cv?.internships?.length || 0}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewCV(sub.id)}>View</Button>
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
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No CVs match filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Pending Advisors Tab */}
        <TabsContent value="advisors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Advisor Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingAdvisors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending advisor requests</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S.no</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Applied On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingAdvisors.map((advisor, idx) => (
                        <TableRow key={advisor.advisor_id || idx}>
                          <TableCell className="font-medium">{idx+1}</TableCell>
                          <TableCell>{advisor.email}</TableCell>
                          <TableCell>{advisor.department}</TableCell>
                          <TableCell>
                              {advisor.createdAt ? new Date(advisor.created_at).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveAdvisor(advisor.id)}
                                className="gap-1"
                              >
                                <CheckCircle className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectAdvisor(advisor.id)}
                                className="gap-1"
                              >
                                <X className="h-4 w-4" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CVViewDialog submission={selectedCV} onClose={() => setSelectedCV(null)} />

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
// 