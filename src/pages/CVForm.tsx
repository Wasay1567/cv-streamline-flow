import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { backend } from '@/integrations/api/backend';
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
import { DEPARTMENTS, BATCHES, cvSchema, emptyCVData } from '@/types/cv';
import type { CVData, AcademicRecord, Internship, Reference, CVSubmission } from '@/types/cv';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';

const STEPS = ['Personal Info', 'Academics', 'FYP Details', 'Career Counseling', 'Internships', 'Industrial Visits', 'Certificates & Achievements', 'Skills', 'Extra-Curricular', 'References'];
type FieldPath = Array<string | number>; // A path to a field in the CV data, e.g. ['personalInfo', 'name'] or ['academics', 0, 'degree']
type ListKey = 'industrialVisits' | 'certificates' | 'achievements' | 'skills' | 'extraCurricular'; // Keys in CVData that represent lists of strings or objects with string fields
const pathKey = (path: FieldPath) => path.map(String).join('.'); // Converts a field path to a string key for tracking touched fields and errors, e.g. ['personalInfo', 'name'] -> 'personalInfo.name'
const isSamePath = (a: FieldPath, b: FieldPath) => a.length === b.length && a.every((segment, index) => String(segment) === String(b[index])); // Compares two field paths for equality, Used to find validation errors for specific fields in the CV data and return the error message if it exists. It does so by comparing the provided path with the paths of all validation errors returned by Zod. If a matching path is found, it returns the corresponding error message; otherwise, it returns null.

// This lives OUTSIDE the main component to avoid the rerendering messing with the input components at step 7 and later
const StringListSection = ({ 
  title, listKey, cvData, updateList, removeFromList, addToList 
} : { 
  title: string; 
  listKey: ListKey; 
  cvData: CVData;
  updateList: (key: ListKey, i: number, value: string) => void;
  removeFromList: (key: ListKey, i: number) => void;
  addToList: (key: ListKey) => void;
}) => (
  <div className="space-y-3">
    {cvData[listKey].map((item, i) => (
      <div key={i} className="flex gap-2">
        <Input 
          value={item} 
          onChange={e => updateList(listKey, i, e.target.value)} 
          placeholder={`Enter ${title.toLowerCase()}`} 
          autoFocus={i === cvData[listKey].length - 1 && item === ""} 
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={() => removeFromList(listKey, i)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={() => addToList(listKey)} 
      className="gap-1"
    >
      <Plus className="h-4 w-4" /> Add {title}
    </Button>
  </div>
);

const CVForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cvData, setCvData] = useState<CVData>(emptyCVData);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [studentImage, setStudentImage] = useState<string>('');
  const [dbUserId, setDbUserId] = useState<string>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    // Fetch user's database ID from profile endpoint
    backend.getUserProfile().then((profile) => {
      if (profile && profile.id) {
        setDbUserId(profile.id);
      }
    }).catch((error) => {
      console.error('Error fetching user profile:', error);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    backend.getMySubmission().then((data) => {
      if (data) {
        setExistingId(data.id);
        try {
          const submissionData = (data as unknown as CVSubmission).cv_data as CVData;
          if (submissionData && submissionData.personalInfo) {
            setCvData(submissionData);
          }
        } catch (error) {
          console.error('Error loading existing submission:', error);
        }
      }
    }).catch((error) => {
      console.error('Error fetching existing submission:', error);
    });
  }, [user]);


  const getFieldError = (path: FieldPath) => {
    try {
      if (!cvData || !cvData.personalInfo) return null;
      const result = cvSchema.safeParse(cvData);
      if (result.success) return null;
      const issue = result.error.issues.find((item) => isSamePath(item.path as FieldPath, path));
      return issue?.message ?? null;
    } catch (error) {
      console.error('Error in field validation:', error);
      return null;
    }
  };

  const validateField = (path: FieldPath) => {
    const key = pathKey(path);
    const message = getFieldError(path);
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  };

  const fieldError = (path: FieldPath) => {
    const key = pathKey(path);
    if (!touched[key]) return null;
    return errors[key] || null;
  };

  const fieldClass = (path: FieldPath) => (fieldError(path) ? 'border-destructive' : '');

  const updatePersonal = (field: string, value: string) => {
    setCvData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
  };

  const updateFYP = (field: string, value: string) => {
    setCvData(prev => ({ ...prev, fyp: { ...prev.fyp, [field]: value } }));
  };

  // Dynamic list helpers

  // Academics
  const addAcademic = () => {
    setCvData(prev => (
      { ...prev, academics: [...prev.academics, { degree: '', university: '', year: '', gpa: '', majors: '' }] }
    ));
  }
  const removeAcademic = (i: number) => {
    setCvData(prev => (
      { ...prev, academics: prev.academics.filter((_, idx) => idx !== i) }
    ));
  }
  const updateAcademic = (i: number, field: keyof AcademicRecord, value: string) => {
    setCvData(prev => ({ ...prev, academics: prev.academics.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  };

  // Industrial visits
  const addListItem = (key: keyof CVData, initialValue: any) => {
    setCvData(prev => ({ ...prev, [key]: [...(prev[key] as any[]), initialValue] }));
  };

  const removeListItem = (key: keyof CVData, i: number) => {
    setCvData(prev => ({ ...prev, [key]: (prev[key] as any[]).filter((_, idx) => idx !== i) }));
  };

  const updateListItem = (key: keyof CVData, i: number, field: string, value: string) => {
    setCvData(prev => ({
      ...prev,
      [key]: (prev[key] as any[]).map((item, idx) => 
        idx === i ? { ...item, [field]: value } : item
      )
    }));
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
  const addToList = (key: ListKey) => {
    setCvData(prev => ({ ...prev, [key]: [...prev[key], ''] }));
  };
  const removeFromList = (key: ListKey, i: number) => {
    setCvData(prev => ({ ...prev, [key]: prev[key].filter((_, idx) => idx !== i) }));
  };
  const updateList = (key: ListKey, i: number, value: string) => {
    setCvData(prev => ({ ...prev, [key]: prev[key].map((v, idx) => idx === i ? value : v) }));
  };

  // Handle photo upload - converts to Base64, sends to Google Apps Script, stores returned photo URL
  const handlePhotoUpload = async (file: File) => {
    if (!user) {
      toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
      return;
    }

    if (!import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL) {
      toast({ title: 'Error', description: 'Google Apps Script URL not configured', variant: 'destructive' });
      console.error('VITE_GOOGLE_APPS_SCRIPT_URL is not set');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select a valid image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setImageUploading(true);
    try {
      // Convert image to Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64String = e.target?.result as string;
          
          if (!base64String) {
            throw new Error('Failed to convert image to base64');
          }
          // Prepare filename with database UUID (not Clerk UUID)
          const fileName = `${dbUserId || user.id}`;

          // Send to Google Apps Script
          const response = await fetch(import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
              fileName: fileName,
              base64Data: base64String,
              mimeType: file.type,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result || !result.fileUrl) {
            throw new Error(result?.error || 'Failed to upload image to Drive');
          }

          // Store the photo URL separately as student_image
          setStudentImage(result.fileUrl);

          toast({ title: 'Success', description: 'Photo uploaded successfully' });
          setImageUploading(false);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to upload photo';
          toast({ title: 'Error', description: message, variant: 'destructive' });
          setImageUploading(false);
        }
      };

      reader.onerror = () => {
        toast({ title: 'Error', description: 'Failed to read image file', variant: 'destructive' });
        setImageUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setImageUploading(false);
    }
  };

  const saveDraft = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { student_id: user.id, cv_data: cvData as any, status: 'not_submitted' as const, updated_at: new Date().toISOString() };
    try {
      const data = await backend.saveMySubmission(payload);
      if (data?.id) setExistingId(data.id);
      toast({ title: 'Draft saved!' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save draft';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // Auth flow:
  // 1. User logs in with Clerk
  // 2. AuthContext reads role from Clerk metadata
  // 3. If no role exists:
  //    - Student/Advisor: redirected to /setup-profile to select role
  //    - Admin: role must be set by DIL admin (backend sets Clerk metadata)
  // 4. After role is set, user sees appropriate dashboard
  // 5. Role data is secured in Clerk (not localStorage)

  const submitCV = async () => {
    if (!user) return;
    
    // Validate photo is uploaded
    if (!studentImage) {
      toast({ title: 'Error', description: 'Please upload a photo to continue', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Call backend POST /cv-submissions/ endpoint with both CV data and image
      await backend.createCV({
        cv_data: cvData,
        student_image: studentImage,
      });
      toast({ title: 'CV submitted!', description: 'Your CV has been sent for advisor review.' });
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit CV';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
    setSaving(false);
  };

  

  const progress = ((step + 1) / STEPS.length) * 100;

  let isFormValid = false;
  try {
    isFormValid = cvData && cvData.personalInfo ? cvSchema.safeParse(cvData).success : false;
  } catch (error) {
    console.error('Error validating form:', error);
    isFormValid = false;
  }

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
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={cvData.personalInfo.name} className={fieldClass(['personalInfo', 'name'])} onChange={e => updatePersonal('name', e.target.value)} onBlur={() => validateField(['personalInfo', 'name'])} />
                    {fieldError(['personalInfo', 'name']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'name'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Father's Name</Label>
                    <Input value={cvData.personalInfo.fatherName} className={fieldClass(['personalInfo', 'fatherName'])} onChange={e => updatePersonal('fatherName', e.target.value)} onBlur={() => validateField(['personalInfo', 'fatherName'])} />
                    {fieldError(['personalInfo', 'fatherName']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'fatherName'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={cvData.personalInfo.department} onValueChange={v => updatePersonal('department', v)}>
                      <SelectTrigger className={fieldClass(['personalInfo', 'department'])} onBlur={() => validateField(['personalInfo', 'department'])}><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    {fieldError(['personalInfo', 'department']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'department'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select value={cvData.personalInfo.batch} onValueChange={v => updatePersonal('batch', v)}>
                      <SelectTrigger className={fieldClass(['personalInfo', 'batch'])} onBlur={() => validateField(['personalInfo', 'batch'])}><SelectValue placeholder="Select batch" /></SelectTrigger>
                      <SelectContent>{BATCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                    {fieldError(['personalInfo', 'batch']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'batch'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Cell</Label>
                    <Input value={cvData.personalInfo.cell} className={fieldClass(['personalInfo', 'cell'])} placeholder='03XX-XXXXXXX' onChange={e => updatePersonal('cell', e.target.value)} onBlur={() => validateField(['personalInfo', 'cell'])} />
                    {fieldError(['personalInfo', 'cell']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'cell'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Roll No</Label>
                    <Input value={cvData.personalInfo.rollNo} className={fieldClass(['personalInfo', 'rollNo'])} placeholder='e.g., ME-20001' onChange={e => updatePersonal('rollNo', e.target.value)} onBlur={() => validateField(['personalInfo', 'rollNo'])} />
                    {fieldError(['personalInfo', 'rollNo']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'rollNo'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>CNIC</Label>
                    <Input value={cvData.personalInfo.cnic} className={fieldClass(['personalInfo', 'cnic'])} placeholder='Write with hyphens(-)' onChange={e => updatePersonal('cnic', e.target.value)} onBlur={() => validateField(['personalInfo', 'cnic'])} />
                    {fieldError(['personalInfo', 'cnic']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'cnic'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={cvData.personalInfo.email} className={fieldClass(['personalInfo', 'email'])} placeholder='Use university email' onChange={e => updatePersonal('email', e.target.value)} onBlur={() => validateField(['personalInfo', 'email'])} />
                    {fieldError(['personalInfo', 'email']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'email'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={cvData.personalInfo.gender} onValueChange={v => updatePersonal('gender', v)}>
                      <SelectTrigger className={fieldClass(['personalInfo', 'gender'])} onBlur={() => validateField(['personalInfo', 'gender'])}><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldError(['personalInfo', 'gender']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'gender'])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={cvData.personalInfo.dob} className={fieldClass(['personalInfo', 'dob'])} onChange={e => updatePersonal('dob', e.target.value)} onBlur={() => validateField(['personalInfo', 'dob'])} />
                    {fieldError(['personalInfo', 'dob']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'dob'])}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea value={cvData.personalInfo.address} className={fieldClass(['personalInfo', 'address'])} placeholder='Your Address' onChange={e => updatePersonal('address', e.target.value)} onBlur={() => validateField(['personalInfo', 'address'])} />
                  {fieldError(['personalInfo', 'address']) && <p className="text-xs text-destructive">{fieldError(['personalInfo', 'address'])}</p>}
                </div>
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Label>Photo *</Label>
                    {studentImage && (
                      <span className="text-xs text-green-600">✓ Uploaded</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Upload a clear passport-style photo (JPEG/PNG, max 5MB)</p>
                  <div className="flex gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      disabled={imageUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePhotoUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 cursor-pointer"
                      disabled={imageUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imageUploading ? 'Uploading...' : 'Select Photo'}
                    </Button>
                    {/* {studentImage && (
                      <div className="flex items-center gap-2">
                        <img
                          src={studentImage}
                          alt="Preview"
                          className="h-24 w-24 object-cover rounded border"
                        />
                      </div>
                    )} */}
                  </div>
                  {!studentImage && <p className="text-xs text-destructive">Photo is required</p>}
                </div>
              </>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => {
                  const isBE = i === 0;
                  const degreeName = i === 1 ? "HSC" : i === 2 ? "SSC" : "University";
                  const a = cvData.academics[i] || {};

                  return (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          {isBE ? "University" : degreeName}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Degree</Label>
                          {isBE ? (
                            <div className="flex flex-col">
                              <select
                                value={a.degree || ""}
                                className={`${fieldClass(["academics", i, "degree"])} border p-2`}
                                onChange={(e) => updateAcademic(i, "degree", e.target.value)}
                                onBlur={() => validateField(["academics", i, "degree"])}
                              >
                                <option value="">Select...</option>
                                <option value="BE">B.E.</option>
                                <option value="BS">B.S.</option>
                              </select>
                              <span className="text-xs text-gray-500">(Discipline)</span>
                            </div>
                          ) : (
                            <div className="p-1 font-medium">
                              {degreeName}
                              <input type="hidden" value={degreeName} />
                            </div>
                          )}
                          {fieldError(["academics", i, "degree"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "degree"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>University/Board</Label>
                          <Input
                            value={a.university || ""}
                            className={fieldClass(["academics", i, "university"])}
                            onChange={(e) => updateAcademic(i, "university", e.target.value)}
                            onBlur={() => validateField(["academics", i, "university"])}
                            placeholder={isBE ? "e.g., NEDUET" : "e.g., Karachi Board / Cambridge"}
                          />
                          {fieldError(["academics", i, "university"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "university"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Year of Passing</Label>
                          <Input
                            value={a.year || ""}
                            className={fieldClass(["academics", i, "year"])}
                            onChange={(e) => updateAcademic(i, "year", e.target.value)}
                            onBlur={() => validateField(["academics", i, "year"])}
                            placeholder="YYYY"
                          />
                          {fieldError(["academics", i, "year"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "year"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Cumulative GPA/Grade</Label>
                          <Input
                            value={a.gpa || ""}
                            className={fieldClass(["academics", i, "gpa"])}
                            onChange={(e) => updateAcademic(i, "gpa", e.target.value)}
                            onBlur={() => validateField(["academics", i, "gpa"])}
                            placeholder={isBE ? "e.g., 3.8" : "e.g., 85% or A1"}
                          />
                          {fieldError(["academics", i, "gpa"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "gpa"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Major Subjects</Label>
                          <Input
                            value={a.majors || ""}
                            className={fieldClass(["academics", i, "majors"])}
                            onChange={(e) => updateAcademic(i, "majors", e.target.value)}
                            onBlur={() => validateField(["academics", i, "majors"])}
                            placeholder={isBE ? "Mechanical Engineering" : "Pre-Engineering / Science"}
                          />
                          {fieldError(["academics", i, "majors"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "majors"])}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Industrial Visits</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addListItem("industrialVisits", { organization: "", purpose: "", date: "" })}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Visit
                  </Button>
                </div>

                <div className="space-y-4">
                  {cvData.industrialVisits.map((visit: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3 relative group">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm text-muted-foreground">Visit #{i + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeListItem("industrialVisits", i)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Organization</Label>
                          <Input
                            value={visit.organization || ""}
                            placeholder="e.g., Toyota Indus Motors"
                            className={fieldClass(["industrialVisits", i, "organization"])}
                            onChange={(e) => updateListItem("industrialVisits", i, "organization", e.target.value)}
                            onBlur={() => validateField(["industrialVisits", i, "organization"])}
                          />
                          {fieldError(["industrialVisits", i, "organization"]) && (
                            <p className="text-xs text-destructive">{fieldError(["industrialVisits", i, "organization"])}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Purpose</Label>
                          <Input
                            value={visit.purpose || ""}
                            placeholder="e.g., Production Line Study"
                            className={fieldClass(["industrialVisits", i, "purpose"])}
                            onChange={(e) => updateListItem("industrialVisits", i, "purpose", e.target.value)}
                            onBlur={() => validateField(["industrialVisits", i, "purpose"])}
                          />
                          {fieldError(["industrialVisits", i, "purpose"]) && (
                            <p className="text-xs text-destructive">{fieldError(["industrialVisits", i, "purpose"])}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            value={visit.date || ""}
                            placeholder="e.g., Oct 2023"
                            className={fieldClass(["industrialVisits", i, "date"])}
                            onChange={(e) => updateListItem("industrialVisits", i, "date", e.target.value)}
                            onBlur={() => validateField(["industrialVisits", i, "date"])}
                          />
                          {fieldError(["industrialVisits", i, "date"]) && (
                            <p className="text-xs text-destructive">{fieldError(["industrialVisits", i, "date"])}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {cvData.industrialVisits.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground py-4 border border-dashed rounded-lg">
                      No industrial visits added yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <div><h4 className="font-medium mb-3">Certificates</h4><StringListSection title="Certificate" listKey="certificates" cvData={cvData} updateList={updateList} removeFromList={removeFromList} addToList={addToList} /></div>
                <div><h4 className="font-medium mb-3">Achievements</h4><StringListSection title="Achievement" listKey="achievements"  cvData={cvData} updateList={updateList} removeFromList={removeFromList} addToList={addToList} /></div>
              </div>
            )}

            {step === 7 && <StringListSection title="Skill" listKey="skills"  cvData={cvData} updateList={updateList} removeFromList={removeFromList} addToList={addToList} />}

            {step === 8 && <StringListSection title="Activity" listKey="extraCurricular"  cvData={cvData} updateList={updateList} removeFromList={removeFromList} addToList={addToList} />}

            {step === 9 && (
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

        <div className="flex justify-between items-start pt-4">
          <Button 
            variant="outline" 
            onClick={() => setStep(Math.max(0, step - 1))} 
            disabled={step === 0} 
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={saving} className="gap-1">
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={submitCV} 
                  disabled={saving || !isFormValid || !studentImage}
                  className="gap-1"
                >
                  <Send className="h-4 w-4" /> {saving ? 'Submitting...' : 'Submit CV'}
                </Button>
              )}
            </div>

            {/* The Helper Text - Only shows on the final step if form is invalid or photo not uploaded */}
            {step === STEPS.length - 1 && (!isFormValid || !studentImage) && (
              <span className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                {!studentImage ? '*Please upload a photo to submit' : '*Please fill all required fields to submit'}
              </span>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CVForm;