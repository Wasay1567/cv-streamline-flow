import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { DEPARTMENTS, BATCHES, emptyCVData } from '@/types/cv';
import type { CVData, AcademicRecord, Internship, Reference, CVSubmission } from '@/types/cv';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';

const STEPS = ['Personal Info', 'Academics', 'FYP Details', 'Career Counseling', 'Internships', 'Industrial Visits', 'Certificates & Achievements', 'Extra-Curricular', 'References'];

const CVForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cvData, setCvData] = useState<CVData>(emptyCVData);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('cv_submissions').select('*').eq('student_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id);
        setCvData((data as unknown as CVSubmission).cv_data as CVData);
      }
    });
  }, [user]);

  const updatePersonal = (field: string, value: string) => {
    setCvData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
  };

  const updateFYP = (field: string, value: string) => {
    setCvData(prev => ({ ...prev, fyp: { ...prev.fyp, [field]: value } }));
  };

  // Dynamic list helpers
  const addAcademic = () => setCvData(prev => ({ ...prev, academics: [...prev.academics, { degree: '', university: '', year: '', gpa: '', majors: '' }] }));
  const removeAcademic = (i: number) => setCvData(prev => ({ ...prev, academics: prev.academics.filter((_, idx) => idx !== i) }));
  const updateAcademic = (i: number, field: keyof AcademicRecord, value: string) => {
    setCvData(prev => ({ ...prev, academics: prev.academics.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  };

  const addInternship = () => setCvData(prev => ({ ...prev, internships: [...prev.internships, { organization: '', position: '', field: '', from: '', to: '' }] }));
  const removeInternship = (i: number) => setCvData(prev => ({ ...prev, internships: prev.internships.filter((_, idx) => idx !== i) }));
  const updateInternship = (i: number, field: keyof Internship, value: string) => {
    setCvData(prev => ({ ...prev, internships: prev.internships.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  };

  const addReference = () => setCvData(prev => ({ ...prev, references: [...prev.references, { name: '', contact: '', occupation: '', relation: '' }] }));
  const removeReference = (i: number) => setCvData(prev => ({ ...prev, references: prev.references.filter((_, idx) => idx !== i) }));
  const updateReference = (i: number, field: keyof Reference, value: string) => {
    setCvData(prev => ({ ...prev, references: prev.references.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  };

  // String list helpers
  const addToList = (key: 'industrialVisits' | 'certificates' | 'achievements' | 'extraCurricular') => {
    setCvData(prev => ({ ...prev, [key]: [...prev[key], ''] }));
  };
  const removeFromList = (key: 'industrialVisits' | 'certificates' | 'achievements' | 'extraCurricular', i: number) => {
    setCvData(prev => ({ ...prev, [key]: prev[key].filter((_, idx) => idx !== i) }));
  };
  const updateList = (key: 'industrialVisits' | 'certificates' | 'achievements' | 'extraCurricular', i: number, value: string) => {
    setCvData(prev => ({ ...prev, [key]: prev[key].map((v, idx) => idx === i ? value : v) }));
  };

  const saveDraft = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { student_id: user.id, cv_data: cvData as any, status: 'not_submitted' as const, updated_at: new Date().toISOString() };
    if (existingId) {
      await supabase.from('cv_submissions').update(payload).eq('id', existingId);
    } else {
      const { data } = await supabase.from('cv_submissions').insert(payload).select().single();
      if (data) setExistingId(data.id);
    }
    toast({ title: 'Draft saved!' });
    setSaving(false);
  };

  const submitCV = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { student_id: user.id, cv_data: cvData as any, status: 'pending_advisor' as const, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (existingId) {
      await supabase.from('cv_submissions').update(payload).eq('id', existingId);
    } else {
      await supabase.from('cv_submissions').insert(payload);
    }
    toast({ title: 'CV submitted!', description: 'Your CV has been sent for advisor review.' });
    navigate('/dashboard');
    setSaving(false);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const StringListSection = ({ title, listKey }: { title: string; listKey: 'industrialVisits' | 'certificates' | 'achievements' | 'extraCurricular' }) => (
    <div className="space-y-3">
      {cvData[listKey].map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} onChange={e => updateList(listKey, i, e.target.value)} placeholder={`Enter ${title.toLowerCase()}`} />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeFromList(listKey, i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => addToList(listKey)} className="gap-1"><Plus className="h-4 w-4" /> Add {title}</Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CV Form</h1>
          <p className="text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="flex gap-2 flex-wrap">
          {STEPS.map((s, i) => (
            <Button key={i} variant={i === step ? 'default' : 'outline'} size="sm" onClick={() => setStep(i)} className="text-xs">
              {i + 1}. {s}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Name</Label><Input value={cvData.personalInfo.name} onChange={e => updatePersonal('name', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Father's Name</Label><Input value={cvData.personalInfo.fatherName} onChange={e => updatePersonal('fatherName', e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={cvData.personalInfo.department} onValueChange={v => updatePersonal('department', v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select value={cvData.personalInfo.batch} onValueChange={v => updatePersonal('batch', v)}>
                      <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                      <SelectContent>{BATCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Cell</Label><Input value={cvData.personalInfo.cell} onChange={e => updatePersonal('cell', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Roll No</Label><Input value={cvData.personalInfo.rollNo} onChange={e => updatePersonal('rollNo', e.target.value)} /></div>
                  <div className="space-y-2"><Label>CNIC</Label><Input value={cvData.personalInfo.cnic} onChange={e => updatePersonal('cnic', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={cvData.personalInfo.email} onChange={e => updatePersonal('email', e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={cvData.personalInfo.gender} onValueChange={v => updatePersonal('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={cvData.personalInfo.dob} onChange={e => updatePersonal('dob', e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Textarea value={cvData.personalInfo.address} onChange={e => updatePersonal('address', e.target.value)} /></div>
              </>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {cvData.academics.map((a, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Degree {i + 1}</span>
                      {cvData.academics.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeAcademic(i)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2"><Label>Degree</Label><Input value={a.degree} onChange={e => updateAcademic(i, 'degree', e.target.value)} /></div>
                      <div className="space-y-2"><Label>University</Label><Input value={a.university} onChange={e => updateAcademic(i, 'university', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Year</Label><Input value={a.year} onChange={e => updateAcademic(i, 'year', e.target.value)} /></div>
                      <div className="space-y-2"><Label>GPA</Label><Input value={a.gpa} onChange={e => updateAcademic(i, 'gpa', e.target.value)} /></div>
                      <div className="space-y-2 md:col-span-2"><Label>Majors</Label><Input value={a.majors} onChange={e => updateAcademic(i, 'majors', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addAcademic} className="gap-1"><Plus className="h-4 w-4" /> Add Degree</Button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <div className="space-y-2"><Label>FYP Title</Label><Input value={cvData.fyp.title} onChange={e => updateFYP('title', e.target.value)} /></div>
                <div className="space-y-2"><Label>Company</Label><Input value={cvData.fyp.company} onChange={e => updateFYP('company', e.target.value)} /></div>
                <div className="space-y-2"><Label>Objectives</Label><Textarea value={cvData.fyp.objectives} onChange={e => updateFYP('objectives', e.target.value)} /></div>
              </div>
            )}

            {step === 3 && (
              <div className="flex items-center gap-3">
                <Switch checked={cvData.careerCounseling} onCheckedChange={v => setCvData(prev => ({ ...prev, careerCounseling: v }))} />
                <Label>Have you attended career counseling?</Label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {cvData.internships.map((intern, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Internship {i + 1}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeInternship(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2"><Label>Organization</Label><Input value={intern.organization} onChange={e => updateInternship(i, 'organization', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Position</Label><Input value={intern.position} onChange={e => updateInternship(i, 'position', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Field</Label><Input value={intern.field} onChange={e => updateInternship(i, 'field', e.target.value)} /></div>
                      <div className="space-y-2"><Label>From</Label><Input type="date" value={intern.from} onChange={e => updateInternship(i, 'from', e.target.value)} /></div>
                      <div className="space-y-2"><Label>To</Label><Input type="date" value={intern.to} onChange={e => updateInternship(i, 'to', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addInternship} className="gap-1"><Plus className="h-4 w-4" /> Add Internship</Button>
              </div>
            )}

            {step === 5 && <StringListSection title="Industrial Visit" listKey="industrialVisits" />}

            {step === 6 && (
              <div className="space-y-6">
                <div><h4 className="font-medium mb-3">Certificates</h4><StringListSection title="Certificate" listKey="certificates" /></div>
                <div><h4 className="font-medium mb-3">Achievements</h4><StringListSection title="Achievement" listKey="achievements" /></div>
              </div>
            )}

            {step === 7 && <StringListSection title="Activity" listKey="extraCurricular" />}

            {step === 8 && (
              <div className="space-y-4">
                {cvData.references.map((ref, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Reference {i + 1}</span>
                      {cvData.references.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeReference(i)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2"><Label>Name</Label><Input value={ref.name} onChange={e => updateReference(i, 'name', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Contact</Label><Input value={ref.contact} onChange={e => updateReference(i, 'contact', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Occupation</Label><Input value={ref.occupation} onChange={e => updateReference(i, 'occupation', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Relation</Label><Input value={ref.relation} onChange={e => updateReference(i, 'relation', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addReference} className="gap-1"><Plus className="h-4 w-4" /> Add Reference</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submitCV} disabled={saving} className="gap-1">
                <Send className="h-4 w-4" /> Submit CV
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CVForm;
