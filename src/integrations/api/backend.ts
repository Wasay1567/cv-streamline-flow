import { api } from "@/integrations/api/client";
import type { AppRole, CVData, CVStatus, CVSubmission, Profile } from "@/types/cv";

export interface UserRole {
  user_id: string;
  role: AppRole;
}

export interface CVListItem {
  cv_id: string;
  student_email: string;
  department: string;
  batch: string;
  cv_status: CVStatus;
  skills: string[];
  cgpa: string;
  internships_count: number;
}

export interface SubmissionWithProfile extends CVSubmission {
  profiles: Profile;
}

export interface BulkNotifyPayload {
  subject: string;
  body: string;
  deadline?: string;
}

export interface BulkNotifyResult {
  sent: number;
}

export interface PendingAdvisor {
  id: string;
  email: string;
  department: string;
}

export interface ApproveRejectResult {
  cv_id: string;
  status: CVStatus;
  rejection_comment?: string;
  message: string;
}

export const backend = {
  // User endpoints
  syncUserProfile(payload: { department: string; role: "student" | "advisor" }) {
    return api.post("/user/sync", payload);
  },

  getUserProfile(token?: string) {
    return api.get<Profile>("/profiles", token ? { token } : undefined);
  },

  // CV endpoints
  createCV(payload: { cv_data: CVData }) {
    return api.post<CVSubmission>("/cv-submissions", payload);
  },

  listCVs() {
    return api.get<CVListItem[]>("/cv-submissions");
  },

  getMySubmission() {
    return api.get<CVSubmission | null>("/cv-submissions/me");
  },

  getMyCVs() {
    return api.get<CVSubmission[]>("/cv-submissions/me");
  },

  getCV(cvId: string) {
    return api.get<CVSubmission>(`/cv-submissions/${cvId}`);
  },

  updateCV(cvId: string, payload: CVData) {
    return api.put<CVSubmission>(`/cv-submissions/${cvId}`, payload);
  },

  deleteCV(cvId: string) {
    return api.delete<{ message: string }>(`/cv-submissions/${cvId}`);
  },

  approveCV(cvId: string) {
    return api.post<ApproveRejectResult>(`/cv-submissions/${cvId}/approve`, {});
  },

  rejectCV(cvId: string, comments?: string) {
    return api.post<ApproveRejectResult>(`/cv-submissions/${cvId}/reject`, { comments });
  },

  // Admin endpoints
  getPendingAdvisors() {
    return api.get<PendingAdvisor[]>("/admin/advisors/pending");
  },

  approveAdvisor(advisorId: string) {
    return api.post<{ message: string }>(`/admin/advisors/${advisorId}/approve`, {});
  },

  rejectAdvisor(advisorId: string) {
    return api.post<{ message: string }>(`/admin/advisors/${advisorId}/reject`, {});
  },

  // Deprecated - keeping for backward compatibility
  saveMySubmission(payload: Partial<CVSubmission> & { cv_data: CVData; status: CVStatus }) {
    return api.put<CVSubmission>("/cv-submissions/me", payload);
  },

  listProfiles() {
    return api.get<Profile[]>("/profiles");
  },

  listSubmissions() {
    return api.get<CVListItem[]>("/cv-submissions");
  },

  updateSubmissionStatus(submissionId: string, status: CVStatus, advisorComments?: string) {
    if (status === "rejected") {
      return this.rejectCV(submissionId, advisorComments);
    } else if (status === "pending_dil" || status === "approved") {
      return this.approveCV(submissionId);
    }
    throw new Error("Invalid status");
  },

  listUserRoles() {
    return api.get<UserRole[]>("/user-roles");
  },

  setUserRole(userId: string, role: AppRole) {
    return api.put<UserRole>(`/user-roles/${userId}`, { role });
  },

  bulkNotifyStudents(payload: BulkNotifyPayload) {
    return api.post<BulkNotifyResult>("/notifications/bulk", payload);
  },
};
