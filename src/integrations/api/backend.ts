import { api } from "@/integrations/api/client";
import type { AppRole, CVData, CVStatus, CVSubmission, Profile } from "@/types/cv";

export interface UserRole {
  user_id: string;
  role: AppRole;
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

export const backend = {
  getMySubmission() {
    return api.get<CVSubmission | null>("/cv-submissions/me");
  },

  saveMySubmission(payload: Partial<CVSubmission> & { cv_data: CVData; status: CVStatus }) {
    return api.put<CVSubmission>("/cv-submissions/me", payload);
  },

  listProfiles() {
    return api.get<Profile[]>("/profiles");
  },

  listSubmissions() {
    return api.get<SubmissionWithProfile[]>("/cv-submissions");
  },

  updateSubmissionStatus(submissionId: string, status: CVStatus, advisorComments?: string) {
    return api.patch<CVSubmission>(`/cv-submissions/${submissionId}/status`, {
      status,
      advisor_comments: advisorComments,
    });
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

