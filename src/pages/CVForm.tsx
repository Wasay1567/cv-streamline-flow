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

/*
const DIMENSION_MAPPING = [
  // Big Five Dimensions
  { name: "Openness", questions: [1, 2, 3] },
  { name: "Conscientiousness", questions: [4, 5, 6] },
  { name: "Extraversion", questions: [7, 8, 9] },
  { name: "Agreeableness", questions: [10, 11, 12] },
  { name: "Emotional Stability", questions: [13, 14, 15] },
  // Industry-Oriented Dimensions
  { name: "Leadership", questions: [16, 17, 18] },
  { name: "Analytical Thinking", questions: [19, 20, 21] },
  { name: "Problem Solving", questions: [22, 23, 24] },
  { name: "Learning Agility", questions: [25, 26, 27] },
  { name: "Digital Adaptability", questions: [28, 29, 30] },
  { name: "Ethical Integrity", questions: [31, 32, 33] },
  { name: "Initiative & Ownership", questions: [34, 35, 36] },
  { name: "Team Collaboration", questions: [37, 38, 39] },
];
*/

const ASSESSMENT_SECTIONS = [
  {
    title: "Big Five Personality Dimensions",
    questions: [
      { id: 1, text: "I enjoy exploring new ideas and innovative solutions." },
      { id: 2, text: "I am comfortable learning new technologies and systems." },
      { id: 3, text: "I adapt quickly to changing environments and expectations." },
      { id: 4, text: "I complete tasks on time and meet deadlines consistently." },
      { id: 5, text: "I plan my work systematically before execution." },
      { id: 6, text: "I pay attention to details in technical or academic work." },
      { id: 7, text: "I feel confident speaking in front of groups." },
      { id: 8, text: "I actively participate in teamwork and discussions." },
      { id: 9, text: "I build professional relationships easily." },
      { id: 10, text: "I cooperate effectively in team-based projects." },
      { id: 11, text: "I respect diverse opinions and viewpoints." },
      { id: 12, text: "I handle conflicts in a constructive manner." },
      { id: 13, text: "I remain calm under academic or professional pressure." },
      { id: 14, text: "I recover quickly from setbacks or failures." },
      { id: 15, text: "I manage stress effectively during deadlines or exams." },
    ]
  },
  {
    title: "Industry-oriented Professional Dimensions",
    questions: [
      { id: 16, text: "I take initiative in academic or project activities." },
      { id: 17, text: "I am comfortable guiding or coordinating team members." },
      { id: 18, text: "I take responsibility for the outcomes of group tasks." },
      { id: 19, text: "I analyze problems logically before proposing solutions." },
      { id: 20, text: "I evaluate multiple alternatives before decision-making." },
      { id: 21, text: "I interpret technical data effectively." },
      { id: 22, text: "I can independently resolve technical challenges." },
      { id: 23, text: "I apply theoretical knowledge to practical situations." },
      { id: 24, text: "I persist until I find workable solutions." },
      { id: 25, text: "I quickly understand new tools, software, or processes." },
      { id: 26, text: "I seek feedback to improve my performance." },
      { id: 27, text: "I continuously upgrade my skills." },
      { id: 28, text: "I am comfortable using digital collaboration platforms." },
      { id: 29, text: "I adapt easily to emerging technologies." },
      { id: 30, text: "I use data and digital tools to improve efficiency." },
      { id: 31, text: "I maintain honesty in academic and professional work." },
      { id: 32, text: "I follow institutional and professional guidelines." },
      { id: 33, text: "I take responsibility for my mistakes." },
      { id: 34, text: "I proactively take responsibility for tasks without waiting for instructions." },
      { id: 35, text: "I take ownership of outcomes, including both successes and failures." },
      { id: 36, text: "I go beyond assigned work to add value to projects or teams." },
      { id: 37, text: "I actively contribute to team discussions and shared goals." },
      { id: 38, text: "I support team members to achieve collective success." },
      { id: 39, text: "I communicate effectively to ensure smooth coordination within a team." },
    ]
  }
];



const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, number>>({});

//const [dimensionScores, setDimensionScores] = useState<Array<{ name: string, average: number }>>([]);

/*
const calculateDimensionAverages = () => {
  const scores = DIMENSION_MAPPING.map(dimension => {
    const sum = dimension.questions.reduce((acc, qId) => {
      return acc + (assessmentAnswers[qId] || 0);
    }, 0);
    
    const average = parseFloat((sum / dimension.questions.length).toFixed(2));
    
    return {
      name: dimension.name,
      average: average
    };
  });

  setDimensionScores(scores);
  console.log("Classified Averages:", scores);
};*/

const STEPS = ['Personal Info', 'Academics', 'FYP Details', 'Career Counseling', 'Internships', 'Industrial Visits', 'Certificates & Achievements', 'Skills', 'Extra-Curricular', 'References', 'Assessment'];
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
  const [dbUserId, setDbUserId] = useState<string>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [gpaDrafts, setGpaDrafts] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const asSubmission = (value: unknown): CVSubmission | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Record<string, unknown>;
    const rawCvData = (candidate.cv_data ?? candidate.cvData) as Partial<CVData> | undefined;
    if (!rawCvData) return null;

    return {
      ...(candidate as unknown as CVSubmission),
      id: String(candidate.id ?? candidate.cv_id ?? candidate.cvId ?? ''),
      cv_data: rawCvData as CVData,
      submitted_at: (candidate.submitted_at ?? candidate.submittedAt ?? null) as string | null,
      updated_at: String(candidate.updated_at ?? candidate.updatedAt ?? ''),
    };
  };

  const getSubmissionId = (value: unknown): string | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Record<string, unknown>;
    const id = candidate.id ?? candidate.cv_id ?? candidate.cvId;
    return typeof id === 'string' && id ? id : null;
  };

  const getSubmissionUpdatedAt = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    const candidate = value as Record<string, unknown>;
    const raw = candidate.updated_at ?? candidate.updatedAt ?? candidate.created_at ?? candidate.createdAt ?? 0;
    return new Date(String(raw)).getTime() || 0;
  };

  const pickLatestId = (payload: unknown): string | null => {
    if (Array.isArray(payload)) {
      const sorted = [...payload].sort((a, b) => getSubmissionUpdatedAt(b) - getSubmissionUpdatedAt(a));
      for (const item of sorted) {
        const id = getSubmissionId(item);
        if (id) return id;
      }
      return null;
    }
    if (payload && typeof payload === 'object') {
      const wrapped = payload as Record<string, unknown>;
      return (
        pickLatestId(wrapped.data) ||
        pickLatestId(wrapped.submissions) ||
        pickLatestId(wrapped.results) ||
        getSubmissionId(payload)
      );
    }
    return null;
  };

  const pickLatestSubmission = (payload: unknown): CVSubmission | null => {
    if (Array.isArray(payload)) {
      const list = payload.map(asSubmission).filter(Boolean) as CVSubmission[];
      if (list.length === 0) return null;
      return [...list].sort((a, b) => {
        const at = new Date(a.updated_at || a.submitted_at || 0).getTime();
        const bt = new Date(b.updated_at || b.submitted_at || 0).getTime();
        return bt - at;
      })[0];
    }

    const direct = asSubmission(payload);
    if (direct) return direct;

    if (payload && typeof payload === 'object') {
      const wrapped = payload as Record<string, unknown>;
      // Common API wrapper patterns: { data: [...] }, { submissions: [...] }, { results: [...] }
      return (
        pickLatestSubmission(wrapped.data) ||
        pickLatestSubmission(wrapped.submissions) ||
        pickLatestSubmission(wrapped.results) ||
        null
      );
    }

    return null;
  };

  const hydrateCVData = (data?: Partial<CVData> | null): CVData => {
    if (!data) return emptyCVData;
    return {
      ...emptyCVData,
      ...data,
      student_image: data.student_image || '',
      personalInfo: { ...emptyCVData.personalInfo, ...(data.personalInfo || {}) },
      academics: Array.isArray(data.academics) && data.academics.length > 0 ? data.academics : emptyCVData.academics,
      fyp: { ...emptyCVData.fyp, ...(data.fyp || {}) },
      internships: Array.isArray(data.internships) ? data.internships : emptyCVData.internships,
      industrialVisits: Array.isArray(data.industrialVisits) ? data.industrialVisits : emptyCVData.industrialVisits,
      certificates: Array.isArray(data.certificates) ? data.certificates : emptyCVData.certificates,
      achievements: Array.isArray(data.achievements) ? data.achievements : emptyCVData.achievements,
      skills: Array.isArray(data.skills) ? data.skills : emptyCVData.skills,
      extraCurricular: Array.isArray(data.extraCurricular) ? data.extraCurricular : emptyCVData.extraCurricular,
      references: Array.isArray(data.references) && data.references.length > 0 ? data.references : emptyCVData.references,
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

  const toISODateOnly = (value: unknown): string => {
    if (typeof value !== 'string' || !value.trim()) return '';
    const trimmed = value.trim();
    // Already date-only ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const toDateStringPreserve = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const raw = value.trim();
    if (!raw) return '';
    return toISODateOnly(raw) || raw;
  };

  const mapBackendCVToFrontend = (raw: unknown): Partial<CVData> => {
    if (!raw || typeof raw !== 'object') return {};
    const data = raw as Record<string, unknown>;

    const assessmentAnswersObj: Record<number, number> = {};

  // 2. Safely extract and loop through the backend array
    const rawAssessment = Array.isArray(data.assessmentAnswers) 
      ? data.assessmentAnswers 
      : [];

    rawAssessment.forEach((item: any) => {
      // Ensure we are mapping the backend keys (questionId/score) correctly
      if (item && item.questionId) {
        assessmentAnswersObj[Number(item.questionId)] = Number(item.score);
      }
    });

    const personal = (data.personal_info ?? data.personalInfo) as Record<string, unknown> | null;
    const academics = Array.isArray(data.academics) ? (data.academics as Record<string, unknown>[]) : [];
    const internships = Array.isArray(data.internships) ? (data.internships as Record<string, unknown>[]) : [];
    const visits = Array.isArray(data.industrial_visits ?? data.industrialVisits)
      ? ((data.industrial_visits ?? data.industrialVisits) as Record<string, unknown>[])
      : [];

    return {
      student_image: String(data.student_image ?? data.student_image_url ?? ''),
      personalInfo: personal
        ? {
            name: String(personal.name ?? ''),
            fatherName: String(personal.father_name ?? personal.fatherName ?? ''),
            department: String(personal.department ?? ''),
            batch: String(personal.batch ?? ''),
            cell: String(personal.cell ?? ''),
            rollNo: String(personal.roll_no ?? personal.rollNo ?? ''),
            cnic: String(personal.cnic ?? ''),
            email: String(personal.email ?? ''),
            gender: String(personal.gender ?? 'Male') as 'Male' | 'Female' | 'Other',
            dob: toISODateOnly(personal.dob ?? ''),
            address: String(personal.address ?? ''),
          }
        : undefined,
      academics: academics.map((a) => ({
        degree: String(a.degree ?? ''),
        university: String(a.university ?? ''),
        from_date: toDateStringPreserve(a.from_date ?? a.from ?? ''),
        to_date: toDateStringPreserve(a.to_date ?? a.to ?? ''),
        gpa: Number.isFinite(Number(a.gpa)) ? Number(a.gpa) : Number.NaN,
        majors: String(a.majors ?? ''),
      })),
      fyp: ((data.fyp as CVData['fyp']) || undefined),
      careerCounseling:
        typeof data.careerCounseling === 'boolean'
          ? (data.careerCounseling as boolean)
          : (typeof data.career_counseling === 'boolean' ? (data.career_counseling as boolean) : undefined),
      internships: internships.map((i) => ({
        organization: String(i.organization ?? ''),
        position: String(i.position ?? ''),
        field: String(i.field ?? ''),
        duties: Array.isArray(i.duties)
          ? (i.duties as unknown[]).map((d) => String(d ?? '').trim()).filter(Boolean)
          : [],
        from: toDateStringPreserve(i.from ?? i.from_date ?? ''),
        to: toDateStringPreserve(i.to ?? i.to_date ?? ''),
      })),
      industrialVisits: visits.map((v) => ({
        organization: String(v.organization ?? ''),
        purpose: String(v.purpose ?? ''),
        date: toDateStringPreserve(v.date ?? v.visit_date ?? ''),
      })),
      certificates: toStringArray(data.certificates, 'name'),
      achievements: toStringArray(data.achievements, 'description'),
      skills: toStringArray(data.skills, 'name'),
      extraCurricular: toStringArray(data.extra_curricular ?? data.extraCurricular, 'activity'),
      assessmentAnswers: assessmentAnswersObj,
      references: Array.isArray(data.references) ? (data.references as CVData['references']) : undefined,
    };
  };

  const mapFrontendCVToBackend = (data: CVData) => ({
    student_image: data.student_image,
    careerCounseling: data.careerCounseling,
    personalInfo: {
      name: data.personalInfo.name,
      fatherName: data.personalInfo.fatherName,
      department: data.personalInfo.department,
      batch: data.personalInfo.batch,
      cell: data.personalInfo.cell,
      rollNo: data.personalInfo.rollNo,
      cnic: data.personalInfo.cnic,
      email: data.personalInfo.email,
      gender: data.personalInfo.gender,
      dob: toDateStringPreserve(data.personalInfo.dob),
      address: data.personalInfo.address,
    },
    academics: data.academics.map((a) => ({
      degree: a.degree,
      university: a.university,
      from_date: toDateStringPreserve(a.from_date),
      to_date: toDateStringPreserve(a.to_date),
      gpa: Number.isFinite(a.gpa) ? String(a.gpa) : '',
      majors: a.majors,
    })),
    internships: data.internships
      .filter((i) => i.organization || i.position || i.field || i.from || i.to)
      .map((i) => ({
        organization: i.organization,
        position: i.position,
        field: i.field,
        duties: (i.duties || []).map((d) => d.trim()).filter(Boolean),
        from_date: toDateStringPreserve(i.from) || null,
        to_date: toDateStringPreserve(i.to) || null,
      })),
    industrialVisits: data.industrialVisits
      .map((v) => ({
        organization: (v.organization || '').trim(),
        purpose: (v.purpose || '').trim(),
        date: toDateStringPreserve(v.date),
      }))
      // Send only complete visit rows to avoid backend 500 on null/empty required fields
      .filter((v) => v.organization && v.purpose && v.date),
    fyp: {
      title: data.fyp.title,
      company: data.fyp.company,
      objectives: data.fyp.objectives,
    },
    certificates: data.certificates,
    achievements: data.achievements,
    skills: data.skills,
    extraCurricular: data.extraCurricular,
    assessmentAnswers: Object.entries(assessmentAnswers).map(([qId, score]) => ({
      questionId: parseInt(qId),
      score: score
    })),
    references: data.references.map((r) => ({
      name: r.name,
      contact: r.contact,
      occupation: r.occupation,
      relation: r.relation,
    })),
  });

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
    const loadExistingCV = async () => {
      try {
        let latest: CVSubmission | null = null;
        let latestId: string | null = null;

        try {
          const all = await backend.getMyCVs();
          latest = pickLatestSubmission(all);
          latestId = pickLatestId(all);
        } catch (error) {
          console.warn('Could not fetch CV list from /cv-submissions/me:', error);
        }

        if (!latest) {
          const single = await backend.getMySubmission();
          // console.log("payload from backend: ",single)
          latest = pickLatestSubmission(single);
          latestId = latestId || pickLatestId(single);
        }

        // /cv-submissions/me currently returns flattened summary rows; fetch full CV by id.
        if (!latest && latestId) {
          try {
            latest = await backend.getCV(latestId);
          } catch (error) {
            console.warn(`Could not fetch CV details for ${latestId}:`, error);
          }
        }

        if (!latest) return;

        const latestRow = latest as unknown as Record<string, unknown>;
        setExistingId(String(latestRow.id ?? latestRow.cv_id ?? ''));
        const rawCvPayload = (latestRow.cv_data ?? latestRow) as unknown;
        const mapped = mapBackendCVToFrontend(rawCvPayload);
        setCvData(hydrateCVData(mapped));
      } catch (error) {
        console.error('Error fetching existing submission:', error);
      }
    };

    loadExistingCV();
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
      { ...prev, academics: [...prev.academics, { degree: '', university: '', from_date: '', to_date: '', gpa: Number.NaN, majors: '' }] }
    ));
  }
  const removeAcademic = (i: number) => {
    setCvData(prev => (
      { ...prev, academics: prev.academics.filter((_, idx) => idx !== i) }
    ));
  }
  const updateAcademic = (i: number, field: keyof AcademicRecord, value: string | number) => {
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

  const addInternship = () => setCvData(prev => ({ ...prev, internships: [...prev.internships, { organization: '', position: '', field: '', duties: [], from: '', to: '' }] }));
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
              action: "upload",
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

          // Store uploaded photo URL inside cv_data.student_image
          setCvData(prev => ({ ...prev, student_image: result.fileUrl }));

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
    console.log(cvData)
    // Validate photo is uploaded
    if (!cvData.student_image) {
      toast({ title: 'Error', description: 'Please upload a photo to continue', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = mapFrontendCVToBackend(cvData);
      console.log('[CVForm] submit payload', payload);
      await backend.createCV(payload as unknown as CVData);
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
                    {cvData.student_image && (
                      <span className="text-xs text-green-600">Uploaded</span>
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
                    {/* {cvData.student_image && (
                      <div className="flex items-center gap-2">
                        <img
                          src={cvData.student_image}
                          alt="Preview"
                          className="h-24 w-24 object-cover rounded border"
                        />
                      </div>
                    )} */}
                  </div>
                  {!cvData.student_image && <p className="text-xs text-destructive">Photo is required</p>}
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
                          <Label>From Date</Label>
                          <Input
                            type="date"
                            value={a.from_date || ""}
                            className={fieldClass(["academics", i, "from_date"])}
                            onChange={(e) => updateAcademic(i, "from_date", e.target.value)}
                            onBlur={() => validateField(["academics", i, "from_date"])}
                          />
                          {fieldError(["academics", i, "from_date"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "from_date"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>To Date</Label>
                          <Input
                            type="date"
                            value={a.to_date || ""}
                            className={fieldClass(["academics", i, "to_date"])}
                            onChange={(e) => updateAcademic(i, "to_date", e.target.value)}
                            onBlur={() => validateField(["academics", i, "to_date"])}
                          />
                          {fieldError(["academics", i, "to_date"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "to_date"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Cumulative GPA/Grade</Label>
                          <Input
                            value={gpaDrafts[i] ?? (Number.isFinite(a.gpa) ? String(a.gpa) : "")}
                            className={fieldClass(["academics", i, "gpa"])}
                            onChange={(e) => {
                              const raw = e.target.value;
                              // Allow intermediate decimal typing states like "3." without breaking input UX.
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              setGpaDrafts((prev) => ({ ...prev, [i]: raw }));
                              updateAcademic(i, "gpa", raw === "" || raw === "." ? Number.NaN : Number(raw));
                            }}
                            onBlur={() => {
                              setGpaDrafts((prev) => {
                                const next = { ...prev };
                                delete next[i];
                                return next;
                              });
                              validateField(["academics", i, "gpa"]);
                            }}
                            placeholder="e.g., 3, 3.5 or 80 if 80%"
                          />
                          {fieldError(["academics", i, "gpa"]) && (
                            <p className="text-xs text-destructive">
                              {fieldError(["academics", i, "gpa"])}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Discipline</Label>
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
                      <div className="space-y-2 md:col-span-2">
                        <Label>Duties (one per line)</Label>
                        <Textarea
                          value={(intern.duties || []).join('\n')}
                          onChange={e => setCvData(prev => ({
                            ...prev,
                            internships: prev.internships.map((row, idx) =>
                              idx === i
                                ? {
                                  ...row,
                                    duties: e.target.value.split('\n'),
                                  }
                                : row
                            ),
                          }))}
                          placeholder={"Increase ready-to-market time by 20%\nAutomated resource updates"}
                        />
                      </div>
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
                            placeholder="e.g., Oct, 2023"
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

            {step === 10 && (
              <div className="space-y-10">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <h3 className="text-blue-800 font-semibold">Personality Competency Assessment</h3>
                  <p className="text-blue-600 text-sm italic">Please rate yourself from 1 (Strongly Disagree) to 5 (Strongly Agree)</p>
                </div>

                {/* Using the constant defined at the top of the file */}
                {ASSESSMENT_SECTIONS.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">{section.title}</h3>
                    <div className="divide-y divide-gray-100">
                      {section.questions.map((q) => (
                        <div key={q.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <span className="text-gray-700 flex-1 text-sm md:text-base">{q.id}. {q.text}</span>
                          <div className="flex items-center gap-3">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <label key={val} className="flex flex-col items-center cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  required
                                  value={val}
                                  checked={assessmentAnswers[q.id] === val}
                                  onChange={() => setAssessmentAnswers(prev => ({ ...prev, [q.id]: val }))}
                                  className="w-5 h-5 cursor-pointer accent-blue-600"
                                />
                                <span className="text-xs mt-1 text-gray-400 group-hover:text-blue-600 font-medium">{val}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
                  disabled={saving || !isFormValid || !cvData.student_image}
                  className="gap-1"
                >
                  <Send className="h-4 w-4" /> {saving ? 'Submitting...' : 'Submit CV'}
                </Button>
              )}
            </div>

            {/* The Helper Text - Only shows on the final step if form is invalid or photo not uploaded */}
            {step === STEPS.length - 1 && (!isFormValid || !cvData.student_image) && (
              <span className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                {!cvData.student_image ? '*Please upload a photo to submit' : '*Please fill all required fields to submit'}
              </span>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CVForm;


/**
 * {
    "student_image": "https://drive.google.com/file/d/1kvQuJZ3uRgsGL1xupMXx4l8Fm6aB_ioz/view?usp=drivesdk",
    "personalInfo": {
        "name": "Wasay",
        "fatherName": "Fatherrrr",
        "department": "Department of Civil Engineering",
        "batch": "2023",
        "cell": "03001234567",
        "rollNo": "CE-23011",
        "cnic": "12345-1234567-1",
        "email": "soomro4601356@cloud.neduet.edu.pk",
        "gender": "Male",
        "dob": "2005-01-04",
        "address": "Gulshan e iqbal, Karachi"
    },
    "academics": [
        {
            "degree": "BE",
            "university": "NEDUET",
            "year": "2026",
            "gpa": "3.5",
            "majors": "Civil Engineering"
        },
        {
            "degree": "HSC",
            "university": "Karachi board",
            "year": "2022",
            "gpa": "77%",
            "majors": "Pre-engineering"
        },
        {
            "degree": "SSC",
            "university": "Karachi board",
            "year": "2020",
            "gpa": "85%",
            "majors": "Science"
        }
    ],
    "fyp": {
        "title": "Building Making",
        "company": "Wasay Builders",
        "objectives": "to learn how buildings are built"
    },
    "careerCounseling": false,
    "internships": [],
    "industrialVisits": [],
    "certificates": [],
    "achievements": [],
    "skills": [],
    "extraCurricular": [],
    "references": [
        {
            "name": "",
            "contact": "",
            "occupation": "",
            "relation": ""
        }
    ]
}
 */
