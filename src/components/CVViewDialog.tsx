import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CVSubmission, CVData } from '@/types/cv';

interface Props {
  submission: CVSubmission | null;
  onClose: () => void;
}

const CVViewDialog = ({ submission, onClose }: Props) => {
  if (!submission) return null;

  const asObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

  const toStringList = (value: unknown, key: string): string[] =>
    asArray(value)
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        const obj = asObject(item);
        const v = obj[key];
        return typeof v === 'string' ? v.trim() : '';
      })
      .filter(Boolean);

  const raw = asObject((submission as unknown as Record<string, unknown>).cv_data ?? submission);
  const personalRaw = asObject(raw.personalInfo ?? raw.personal_info);

  const cv = {
    student_image: String(
      raw.student_image ??
        raw.student_image_url ??
        (submission as unknown as { student_image?: string }).student_image ??
        ''
    ),
    personalInfo: {
      name: String(personalRaw.name ?? ''),
      fatherName: String(personalRaw.fatherName ?? personalRaw.father_name ?? ''),
      department: String(personalRaw.department ?? ''),
      batch: String(personalRaw.batch ?? ''),
      rollNo: String(personalRaw.rollNo ?? personalRaw.roll_no ?? ''),
      cnic: String(personalRaw.cnic ?? ''),
      email: String(personalRaw.email ?? ''),
      cell: String(personalRaw.cell ?? ''),
      gender: String(personalRaw.gender ?? ''),
      dob: String(personalRaw.dob ?? ''),
      address: String(personalRaw.address ?? ''),
    },
    academics: asArray(raw.academics).map((entry) => {
      const a = asObject(entry);
      return {
        degree: String(a.degree ?? ''),
        university: String(a.university ?? ''),
        from_date: String(a.from_date ?? a.from ?? a.year ?? ''),
        to_date: String(a.to_date ?? a.to ?? ''),
        gpa: String(a.gpa ?? ''),
        majors: String(a.majors ?? ''),
      };
    }),
    fyp: {
      title: String(asObject(raw.fyp).title ?? ''),
      company: String(asObject(raw.fyp).company ?? ''),
      objectives: String(asObject(raw.fyp).objectives ?? ''),
    },
    careerCounseling:
      typeof raw.careerCounseling === 'boolean'
        ? raw.careerCounseling
        : Boolean(raw.career_counseling),
    internships: asArray(raw.internships).map((entry) => {
      const i = asObject(entry);
      return {
        organization: String(i.organization ?? ''),
        position: String(i.position ?? ''),
        field: String(i.field ?? ''),
        from: String(i.from ?? i.from_date ?? ''),
        to: String(i.to ?? i.to_date ?? ''),
        duties: asArray(i.duties).map((d) => String(d ?? '').trim()).filter(Boolean),
      };
    }),
    industrialVisits: asArray(raw.industrialVisits ?? raw.industrial_visits).map((entry) => {
      const v = asObject(entry);
      return {
        organization: String(v.organization ?? ''),
        purpose: String(v.purpose ?? ''),
        date: String(v.date ?? v.visit_date ?? ''),
      };
    }),
    certificates: toStringList(raw.certificates, 'name'),
    achievements: toStringList(raw.achievements, 'description'),
    skills: toStringList(raw.skills, 'name'),
    extraCurricular: toStringList(raw.extraCurricular ?? raw.extra_curricular, 'activity'),
    references: asArray(raw.references).map((entry) => {
      const r = asObject(entry);
      return {
        name: String(r.name ?? ''),
        contact: String(r.contact ?? ''),
        occupation: String(r.occupation ?? ''),
        relation: String(r.relation ?? ''),
      };
    }),
  } as Partial<CVData> & {
    academics: Array<{ degree: string; university: string; from_date: string; to_date: string; gpa: string; majors: string }>;
    internships: Array<{ organization: string; position: string; field: string; from: string; to: string; duties: string[] }>;
    industrialVisits: Array<{ organization: string; purpose: string; date: string }>;
    certificates: string[];
    achievements: string[];
    skills: string[];
    extraCurricular: string[];
    references: Array<{ name: string; contact: string; occupation: string; relation: string }>;
  };

  const studentImageUrl = cv.student_image || '';
  const driveFileIdMatch = studentImageUrl.match(/[?&]id=([a-zA-Z0-9_-]{20,})|\/d\/([a-zA-Z0-9_-]{20,})/);
  const driveFileId = driveFileIdMatch?.[1] || driveFileIdMatch?.[2] || '';
  const embeddableImageUrl = driveFileId
    ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000`
    : studentImageUrl;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-primary border-b pb-1">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value || '—'}</span>
    </div>
  );

  return (
    <Dialog open={!!submission} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CV Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* <Section title="Student Photo">
            {studentImageUrl ? (
              <div className="space-y-2">
                <img
                  src={embeddableImageUrl}
                  alt="Student"
                  className="h-32 w-32 rounded-md border object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== studentImageUrl) {
                      img.src = studentImageUrl;
                    }
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No image uploaded.</p>
            )}
          </Section> */}

          <Section title="Personal Information">
            <Field label="Name" value={cv.personalInfo?.name || ''} />
            <Field label="Father's Name" value={cv.personalInfo?.fatherName || ''} />
            <Field label="Department" value={cv.personalInfo?.department || ''} />
            <Field label="Batch" value={cv.personalInfo?.batch || ''} />
            <Field label="Roll No" value={cv.personalInfo?.rollNo || ''} />
            <Field label="CNIC" value={cv.personalInfo?.cnic || ''} />
            <Field label="Email" value={cv.personalInfo?.email || ''} />
            <Field label="Cell" value={cv.personalInfo?.cell || ''} />
            <Field label="Gender" value={cv.personalInfo?.gender || ''} />
            <Field label="Date of Birth" value={cv.personalInfo?.dob || ''} />
            <Field label="Address" value={cv.personalInfo?.address || ''} />
          </Section>

          <Section title="Academics">
            {cv.academics?.map((a, i) => (
              <div key={i} className="border rounded p-3 space-y-1 text-sm">
                <Field label="Degree" value={a.degree} />
                <Field label="University" value={a.university} />
                <Field label="From Date" value={a.from_date} />
                <Field label="To Date" value={a.to_date} />
                <Field label="GPA" value={String(a.gpa)} />
                <Field label="Majors" value={a.majors} />
              </div>
            ))}
          </Section>

          <Section title="FYP Details">
            <Field label="Title" value={cv.fyp?.title || ''} />
            <Field label="Company" value={cv.fyp?.company || ''} />
            <Field label="Objectives" value={cv.fyp?.objectives || ''} />
          </Section>

          <Section title="Career Counseling">
            <p className="text-sm">{cv.careerCounseling === undefined ? '—' : (cv.careerCounseling ? 'Yes' : 'No')}</p>
          </Section>

          {cv.internships?.length > 0 && (
            <Section title="Internships">
              {cv.internships.map((i, idx) => (
                <div key={idx} className="border rounded p-3 space-y-1 text-sm">
                  <Field label="Organization" value={i.organization} />
                  <Field label="Position" value={i.position} />
                  <Field label="Field" value={i.field} />
                  <Field label="From" value={i.from} />
                  <Field label="To" value={i.to} />
                  <Field label="Duties" value={i.duties.join(', ')} />
                </div>
              ))}
            </Section>
          )}

          {cv.industrialVisits?.length > 0 && (
            <Section title="Industrial Visits">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.industrialVisits.map((v, i) => (
                  <li key={i}>
                    {v.organization} - ({v.date})
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {cv.certificates?.length > 0 && (
            <Section title="Certificates">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.certificates.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </Section>
          )}

          {cv.achievements?.length > 0 && (
            <Section title="Achievements">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.achievements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Section>
          )}

          {cv.extraCurricular?.length > 0 && (
            <Section title="Extra-Curricular">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.extraCurricular.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </Section>
          )}

          {cv.skills?.length > 0 && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {cv.skills.map((s, i) => (
                  <span key={i} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {cv.references?.length > 0 && (
            <Section title="References">
              {cv.references.map((r, idx) => (
                <div key={idx} className="border rounded p-3 space-y-1 text-sm">
                  <Field label="Name" value={r.name} />
                  <Field label="Contact" value={r.contact} />
                  <Field label="Occupation" value={r.occupation} />
                  <Field label="Relation" value={r.relation} />
                </div>
              ))}
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CVViewDialog;
