export interface AcademicRecord {
  degree: string;
  university: string;
  year: string;
  gpa: string;
  majors: string;
}

export interface Internship {
  organization: string;
  position: string;
  field: string;
  from: string;
  to: string;
}

export interface Reference {
  name: string;
  contact: string;
  occupation: string;
  relation: string;
}

export interface CVData {
  personalInfo: {
    name: string;
    fatherName: string;
    department: string;
    batch: string;
    cell: string;
    rollNo: string;
    cnic: string;
    email: string;
    gender: string;
    dob: string;
    address: string;
  };
  academics: AcademicRecord[];
  fyp: {
    title: string;
    company: string;
    objectives: string;
  };
  careerCounseling: boolean;
  internships: Internship[];
  industrialVisits: string[];
  certificates: string[];
  achievements: string[];
  extraCurricular: string[];
  references: Reference[];
}

export type AppRole = 'student' | 'advisor' | 'dil_admin';
export type CVStatus = 'not_submitted' | 'pending_advisor' | 'pending_dil' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string;
  batch: string;
}

export interface CVSubmission {
  id: string;
  student_id: string;
  status: CVStatus;
  cv_data: CVData;
  advisor_comments: string;
  submitted_at: string | null;
  updated_at: string;
}

export const DEPARTMENTS = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Software Engineering',
  'Chemical Engineering',
];

export const BATCHES = ['2020', '2021', '2022', '2023', '2024', '2025'];

export const emptyCVData: CVData = {
  personalInfo: {
    name: '', fatherName: '', department: '', batch: '', cell: '',
    rollNo: '', cnic: '', email: '', gender: '', dob: '', address: '',
  },
  academics: [{ degree: '', university: '', year: '', gpa: '', majors: '' }],
  fyp: { title: '', company: '', objectives: '' },
  careerCounseling: false,
  internships: [],
  industrialVisits: [],
  certificates: [],
  achievements: [],
  extraCurricular: [],
  references: [{ name: '', contact: '', occupation: '', relation: '' }],
};
