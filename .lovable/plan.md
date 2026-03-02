

# Multi-Role CV Automation System

## Overview
A university CV management platform where students submit structured CVs, class advisors review/approve them per department, and DIL admins have a global overview. Built with React + Tailwind + a custom FastAPI backend.

---

## 1. Authentication & Role Management

- **Login/Signup page** with email-based auth via FastAPI backend
- **Roles**: `student`, `advisor`, `dil_admin` — stored in a separate `user_roles` table (not on profiles) to prevent privilege escalation
- **Admin assigns roles** — only a `dil_admin` can assign or change user roles via an admin panel
- After login, users are routed to the correct dashboard based on their role
- Password reset flow with dedicated `/reset-password` page

---

## 2. Database Structure (FastAPI + DB)

- **`profiles`** table: `id`, `email`, `full_name`, `department`, `batch` — auto-created on signup via trigger
- **`user_roles`** table: `user_id`, `role` (enum: `student`, `advisor`, `dil_admin`) — secured with RLS + `has_role()` security definer function
- **`cv_submissions`** table: `id`, `student_id` (FK), `status` (enum: `not_submitted`, `pending_advisor`, `pending_dil`, `approved`, `rejected`), `cv_data` (JSONB), `advisor_comments` (text), `submitted_at`, `updated_at`
- RLS policies so students see only their own data, advisors see their department/batch, and dil_admins see everything

---

## 3. Student Experience

### Multi-Step CV Form
A guided, multi-section form matching the provided JSON structure:

1. **Personal Info** — Name, father's name, department, batch, cell, roll no, CNIC, email, gender, DOB, address
2. **Academics** — Dynamic list of degrees (degree, university, year, GPA, majors) — add/remove entries
3. **FYP Details** — Title, company, objectives
4. **Career Counseling** — Yes/No toggle
5. **Internships** — Dynamic list (org, position, field, from, to)
6. **Industrial Visits** — Dynamic list
7. **Certificates & Achievements** — Dynamic text lists
8. **Extra-Curricular Activities** — Dynamic text list
9. **References** — Dynamic list (name, contact, occupation, relation)

Each section has validation. Progress indicator shows completion. Students can save drafts and submit when ready.

### Student Dashboard
- Current submission status displayed prominently (e.g., "Pending Advisor Approval", "Rejected — see comments")
- View advisor rejection comments
- Edit and resubmit if rejected

---

## 4. Class Advisor Dashboard

- **Filtered student list** showing only students from the advisor's department and batch
- **Filter tabs**: All / Not Submitted / Pending / Approved / Rejected
- **Click a student** → view their full CV in a clean read-only layout
- **Action buttons**: "Approve" (moves status to `pending_dil`) or "Reject" (opens comment dialog)
- **"Send Email Reminder"** button — triggers a backend endpoint that sends real emails (via Resend or similar) to all students who haven't submitted yet

---

## 5. DIL Admin Dashboard

- **Global stats overview**: Total students, total submissions, department-wise progress (with charts)
- **All-departments student list** with search and filters
- **CV review & final approval** — can approve CVs that are in `pending_dil` status
- **Role management panel** — assign roles to users (student/advisor/dil_admin) and set advisor department/batch assignments

---

## 6. Email Reminder Feature (Backend Endpoint)

- A FastAPI endpoint that accepts a department/batch filter
- Queries students without submissions and sends reminder emails
- Requires an email service API key (e.g., Resend) stored as a backend environment secret
- Triggered from the Advisor Dashboard UI

---

## 7. Design & UX

- **Modern academic theme**: Blue/white color palette, clean typography
- **Mobile responsive** across all views
- **Progress indicators** on the CV form (step tracker)
- **Status badges** with color coding (green = approved, yellow = pending, red = rejected)
- **Toast notifications** for actions (submit, approve, reject)
