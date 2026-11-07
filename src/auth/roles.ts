import type { Profile, UserRole } from '../api/types';

export function roleOf(profile: Profile | null | undefined): UserRole | null {
  if (profile?.role === 'teacher' || profile?.role === 'student') return profile.role;
  return null;
}

export function isTeacher(profile: Profile | null | undefined): boolean {
  return roleOf(profile) === 'teacher';
}

export function isStudent(profile: Profile | null | undefined): boolean {
  return roleOf(profile) === 'student';
}
