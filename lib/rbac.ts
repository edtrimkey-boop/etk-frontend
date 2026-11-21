/**
 * Centralized Role-Based Access Control (RBAC) & Privacy Policy Engine
 * Strict parity with Ed-Trim Key Architecture & index.html
 */

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'operator' | 'student';

export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'admin';
  const r = String(role).toLowerCase().trim();

  if (
    r === 'super_admin' ||
    r === 'super admin' ||
    r === 'sys_admin' ||
    r === 'system admin' ||
    r === 'all'
  ) {
    return 'super_admin';
  }

  if (r === 'operator' || r === 'typist' || r === 'formatter' || r === 'proofreader') {
    return 'operator';
  }

  if (r === 'teacher' || r === 'faculty' || r === 'educator') {
    return 'teacher';
  }

  if (r === 'student' || r === 'parent' || r === 'guardian') {
    return 'student';
  }

  return 'admin'; // Default to Institute Administrator
}

export function getRoleBadge(role?: string | null): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  const norm = normalizeRole(role);
  switch (norm) {
    case 'super_admin':
      return {
        label: 'Super Admin',
        color: '#26C3EA',
        bg: 'rgba(38, 195, 234, 0.15)',
        border: 'rgba(38, 195, 234, 0.35)',
      };
    case 'admin':
      return {
        label: 'Institute Admin',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
      };
    case 'teacher':
      return {
        label: 'Teacher',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
      };
    case 'operator':
      return {
        label: 'Production Operator',
        color: '#8B5CF6',
        bg: 'rgba(139, 92, 246, 0.15)',
        border: 'rgba(139, 92, 246, 0.35)',
      };
    case 'student':
      return {
        label: 'Student Portal',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.35)',
      };
  }
}

export interface RolePermissions {
  canViewSuperAdminPages: boolean;
  canViewInstituteBilling: boolean;
  canManageTeachers: boolean;
  canManageStudents: boolean;
  canViewOperatorWorkspace: boolean;
  canViewOperatorEarnings: boolean;
  canDispatchCampusBroadcast: boolean;
  canDispatchGlobalBroadcast: boolean;
  canDispatchClassAnnouncement: boolean;
  canSubmitPaperRequests: boolean;
  canSubmitDocRequests: boolean;
}

export function getPermissions(role?: string | null): RolePermissions {
  const norm = normalizeRole(role);

  switch (norm) {
    case 'super_admin':
      return {
        canViewSuperAdminPages: true,
        canViewInstituteBilling: false, // Super Admin uses Global Ledger
        canManageTeachers: false, // Institute Admin manages their teachers
        canManageStudents: false, // Institute Admin manages their students
        canViewOperatorWorkspace: true,
        canViewOperatorEarnings: false,
        canDispatchCampusBroadcast: true,
        canDispatchGlobalBroadcast: true,
        canDispatchClassAnnouncement: true,
        canSubmitPaperRequests: false,
        canSubmitDocRequests: false,
      };

    case 'admin':
      return {
        canViewSuperAdminPages: false,
        canViewInstituteBilling: true,
        canManageTeachers: true,
        canManageStudents: true,
        canViewOperatorWorkspace: false,
        canViewOperatorEarnings: false,
        canDispatchCampusBroadcast: true,
        canDispatchGlobalBroadcast: false,
        canDispatchClassAnnouncement: true,
        canSubmitPaperRequests: true,
        canSubmitDocRequests: true,
      };

    case 'teacher':
      return {
        canViewSuperAdminPages: false,
        canViewInstituteBilling: false,
        canManageTeachers: false,
        canManageStudents: false, // Can view students list, but not manage credentials
        canViewOperatorWorkspace: false,
        canViewOperatorEarnings: false,
        canDispatchCampusBroadcast: false,
        canDispatchGlobalBroadcast: false,
        canDispatchClassAnnouncement: true, // Only own class announcements
        canSubmitPaperRequests: true,
        canSubmitDocRequests: true,
      };

    case 'operator':
      return {
        canViewSuperAdminPages: false,
        canViewInstituteBilling: false,
        canManageTeachers: false,
        canManageStudents: false,
        canViewOperatorWorkspace: true,
        canViewOperatorEarnings: true,
        canDispatchCampusBroadcast: false,
        canDispatchGlobalBroadcast: false,
        canDispatchClassAnnouncement: false,
        canSubmitPaperRequests: false,
        canSubmitDocRequests: false,
      };

    case 'student':
      return {
        canViewSuperAdminPages: false,
        canViewInstituteBilling: false,
        canManageTeachers: false,
        canManageStudents: false,
        canViewOperatorWorkspace: false,
        canViewOperatorEarnings: false,
        canDispatchCampusBroadcast: false,
        canDispatchGlobalBroadcast: false,
        canDispatchClassAnnouncement: false,
        canSubmitPaperRequests: false,
        canSubmitDocRequests: false,
      };
  }
}
