import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CVSubmission, CVData } from '@/types/cv';

interface Props {
  submission: CVSubmission | null;
  onClose: () => void;
}

const CVViewDialog = ({ submission, onClose }: Props) => {
  if (!submission) return null;
  const cv = (submission.cv_data ?? {}) as Partial<CVData>;

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
        <DialogHeader><DialogTitle>CV Details</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <Section title="Personal Information">
            <Field label="Name" value={cv?.personalInfo?.name || ''} />
            <Field label="Father's Name" value={cv?.personalInfo?.fatherName || ''} />
            <Field label="Department" value={cv?.personalInfo?.department || ''} />
            <Field label="Batch" value={cv?.personalInfo?.batch || ''} />
            <Field label="Roll No" value={cv?.personalInfo?.rollNo || ''} />
            <Field label="CNIC" value={cv?.personalInfo?.cnic || ''} />
            <Field label="Email" value={cv?.personalInfo?.email || ''} />
            <Field label="Cell" value={cv?.personalInfo?.cell || ''} />
            <Field label="Gender" value={cv?.personalInfo?.gender || ''} />
            <Field label="Date of Birth" value={cv?.personalInfo?.dob || ''} />
            <Field label="Address" value={cv?.personalInfo?.address || ''} />
          </Section>

          <Section title="Academics">
            {cv.academics?.map((a, i) => (
              <div key={i} className="border rounded p-3 space-y-1 text-sm">
                <Field label="Degree" value={a.degree} />
                <Field label="University" value={a.university} />
                <Field label="Year" value={a.year} />
                <Field label="GPA" value={a.gpa} />
                <Field label="Majors" value={a.majors} />
              </div>
            ))}
          </Section>

          <Section title="FYP Details">
            <Field label="Title" value={cv?.fyp?.title || ''} />
            <Field label="Company" value={cv?.fyp?.company || ''} />
            <Field label="Objectives" value={cv?.fyp?.objectives || ''} />
          </Section>

          <Section title="Career Counseling">
            <p className="text-sm">{cv?.careerCounseling === undefined ? '—' : (cv.careerCounseling ? 'Yes' : 'No')}</p>
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
                </div>
              ))}
            </Section>
          )}

          {cv.industrialVisits?.length > 0 && (
            <Section title="Industrial Visits">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.industrialVisits.map((v, i) => <li key={i}>
                  {v.organization} - ({v.date})
                </li>)}
              </ul>
            </Section>
          )}

          {cv.certificates?.length > 0 && (
            <Section title="Certificates">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.certificates.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </Section>
          )}

          {cv.achievements?.length > 0 && (
            <Section title="Achievements">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.achievements.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Section>
          )}

          {cv.extraCurricular?.length > 0 && (
            <Section title="Extra-Curricular">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {cv.extraCurricular.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Section>
          )}

          {cv.skills?.length > 0 && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {cv.skills.map((s, i) => (
                  <span key={i} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{s}</span>
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
