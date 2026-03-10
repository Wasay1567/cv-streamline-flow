import { z } from "zod";

const currentYear = new Date().getFullYear();
const monthYearRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;

export const cvSchema = z.object({
  student_image: z.string().trim(),
  personalInfo: z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters long"),
    fatherName: z.string().trim().min(3, "Father's name must be at least 3 characters long"),
    department: z.string().trim().min(2, "Department is required"),
    batch: z.string().trim().min(4, "Batch is required"),
    cell: z.string().trim().regex(/^03\d{2}\d{7}$/, "Format: 03XXXXXXXXX"),
    rollNo: z.string().trim().toUpperCase().regex(/^[A-Z]{2}-2[0-9]{4}$/, "Format: ME-20001"),
    cnic: z.string().trim().regex(/^\d{5}-\d{7}-\d{1}$/, "Format: 12345-1234567-1"),
    email: z.string().trim()
      .toLowerCase()
      .regex(/^[a-zA-Z0-9._%+-]+@cloud\.neduet\.edu\.pk$/, "Must use university email (@cloud.neduet.edu.pk)"),
    gender: z.enum(["Male", "Female", "Other"], {message: "Select a gender"}),
    dob: z.string().trim().min(1, "Date of birth is required").refine((dateString) => {
      const dobDate = new Date(dateString);
      return dobDate < new Date();
        }, { message: "Date of birth cannot be in the future" }),
        address: z.string().trim().min(10, "Please provide a complete postal address"),
      }),

      academics: z.array(
        z.object({
      degree: z.string().min(1, "Degree is required"),
      university: z.string().min(2, "University/Board name is required"),
      from_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
      to_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
      gpa: z.coerce
        .number()
        .refine((value) => Number.isFinite(value), "GPA must be a valid number"),
  majors: z.string().min(2, "Major is Required"),
    })
  ),

  fyp: z.object({
    title: z.string().trim().min(3, "FYP title must be at least 5 characters long"),
    company: z.string().trim(),
    objectives: z.string().trim().min(10, "FYP objectives must be at least 10 characters long"),
  }),

  careerCounseling: z.boolean(), //we can also use ENUM here for YES and NO

  internships: z.array(
    z.object({
      organization: z.string().trim().optional().or(z.literal('')),
      position: z.string().trim().optional().or(z.literal('')),
      field: z.string().trim().optional().or(z.literal('')),
      from: z.string().trim().optional().or(z.literal('')),
      to: z.string().trim().optional().or(z.literal('')),
      duties: z.array(z.string().trim()).optional().default([]),
    })
  ),

  industrialVisits: z.array(
    z.object({
      organization: z.string().trim().optional().or(z.literal('')),
      purpose: z.string().trim().optional().or(z.literal('')),
      date: z.string().trim().optional().or(z.literal('')),
    })
  ),
  certificates: z.array(z.string().trim()),
  achievements: z.array(z.string().trim()),
  skills: z.array(z.string().trim()),
  extraCurricular: z.array(z.string().trim()),

  references: z.array(
    z.object({
      name: z.string().trim().optional().or(z.literal('')),
      contact: z.string().trim().optional().or(z.literal('')),
      occupation: z.string().trim().optional().or(z.literal('')),
      relation: z.string().trim().optional().or(z.literal('')),
    })
  ),
});


export interface AcademicRecord {
  degree: string;
  university: string;
  from_date: string;
  to_date: string;
  gpa: number;
  majors: string;
}

export interface Internship {
  organization: string;
  position: string;
  field: string;
  from: string;
  to: string;
  duties: string[];
}

export interface Reference {
  name: string;
  contact: string;
  occupation: string;
  relation: string;
}

export type CVData = z.infer<typeof cvSchema>;


// export interface CVData {
//   personalInfo: {
//     name: string;
//     fatherName: string;
//     department: string;
//     batch: string;
//     cell: string;
//     rollNo: string;
//     cnic: string;
//     email: string;
//     gender: string;
//     dob: string;
//     address: string;
//   };
//   academics: AcademicRecord[];
//   fyp: {
//     title: string;
//     company: string;
//     objectives: string;
//   };
//   careerCounseling: boolean;
//   internships: Internship[];
//   industrialVisits: string[];
//   certificates: string[];
//   achievements: string[];
//   skills: string[];
//   extraCurricular: string[];
//   references: Reference[];
// }

export type AppRole = 'student' | 'advisor' | 'dil_admin';
export type CVStatus = 'not_submitted' | 'pending_advisor' | 'pending_dil' | 'approved' | 'rejected' | 'draft';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string;
  batch: string;
  role?: AppRole;
}

export interface CVSubmission {
  id: string;
  student_id: string;
  status: CVStatus;
  cv_data: CVData;
  rejection_comment: string;
  submitted_at: string | null;
  updated_at: string;
}

export const DEPARTMENTS = [
  // Civil & related
  'Department of Civil Engineering',
  'Department of Urban and Infrastructure Engineering',
  'Department of Petroleum Engineering',
  'Department of Earthquake Engineering',
  'Department of Environmental Engineering',
  
  // Electrical & related
  'Department of Electrical Engineering',
  'Department of Electronic Engineering',
  'Department of Telecommunications Engineering',
  
  // Computer & Software
  'Department of Computer and Information Systems Engineering',
  'Department of Bio-Medical Engineering',
  'Department of Computer Science & Information Technology',
  'Department of Software Engineering',
  
  // Mechanical & related
  'Department of Mechanical Engineering',
  'Department of Industrial and Manufacturing Engineering',
  'Department of Textile Engineering',
  'Department of Automotive and Marine Engineering',
  
  // Chemical & related
  'Department of Chemical Engineering',
  'Department of Polymer and Petrochemical Engineering',
  'Department of Materials Engineering',
  'Department of Metallurgical Engineering',
  'Department of Food Engineering',
  
  // Other disciplines
  'Department of Architecture and Planning',
  'Department of Economics and Management Sciences',
  'Department of Physics',
  'Department of Chemistry',
  'Department of Mathematics',
  'Department of English Linguistics & Allied Studies',
  'Department of Essential Studies',
];

export const BATCHES = Array.from({ length: 4 }, (_, i) => (currentYear - i-1).toString());

export const emptyCVData: CVData = {
  student_image: '',
  personalInfo: {
    name: '',
    fatherName: '',
    department: '',
    batch: '',
    cell: '',
    rollNo: '',
    cnic: '',
    email: '',
    gender: 'Male',
    dob: '',
    address: '',
  },
  // Initializing with 3 objects ensures the University, HSC, and SSC rows 
  // are immediately editable and match your static UI mapping [0, 1, 2]
  academics: [
    { degree: '', university: '', from_date: '', to_date: '', gpa: Number.NaN, majors: '' },    // Index 0: University
    { degree: 'HSC', university: '', from_date: '', to_date: '', gpa: Number.NaN, majors: '' },   // Index 1: HSC
    { degree: 'SSC', university: '', from_date: '', to_date: '', gpa: Number.NaN, majors: '' },   // Index 2: SSC
  ],
  fyp: { 
    title: '', 
    company: '', 
    objectives: '' 
  },
  careerCounseling: false,
  // Your schema allows these to be empty arrays initially
  internships: [], 
  // Since you moved Industrial Visits to an object structure in the schema:
  industrialVisits: [], 
  certificates: [],
  achievements: [],
  skills: [],
  extraCurricular: [],
  // References usually start with at least one empty contact card
  references: [
    { name: '', contact: '', occupation: '', relation: '' }
  ],
};
