/** One weighted row on a course's grade page. */
export interface Assessment {
  /** Stable row identity (rows can share names). */
  id: string;
  name: string;
  /** Percent of the final grade, 0–100. */
  weight: number;
  /** Percent earned, 0–100, or null when not graded yet. */
  grade: number | null;
  /** Projected percent for an ungraded row, or null. */
  estimate: number | null;
}

export interface Course {
  /** Stable identity. Two courses may share a code; they never share an id. */
  id: string;
  code: string;
  title: string;
  icon: string;
  /** Grade typed in when the course was created. Superseded once assessments exist. */
  grade: number | null;
  crncr: boolean;
  folderId: string | null;
  assessments: Assessment[];
  /** ISO timestamp of the last local edit; drives cloud merge. */
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  updatedAt: string;
}

/** Bookkeeping that lets sync tell "deleted on another device" from "new on this one". */
export interface SyncMeta {
  /** Course ids known to exist in the cloud as of the last successful sync. */
  syncedCourseIds: string[];
  syncedFolderIds: string[];
  /** Ids deleted locally that still need deleting in the cloud. */
  pendingCourseDeletes: string[];
  pendingFolderDeletes: string[];
}

export interface SemesterState {
  version: 6;
  courses: Course[];
  folders: Folder[];
  currentFolderId: string | null;
  sync: SyncMeta;
}

export interface AuthState {
  loggedIn: boolean;
  username?: string;
  email?: string;
  id?: string | null;
  fullName?: string;
}

export interface Onboarding {
  university?: string;
  year?: string;
  program?: string;
}

export interface Profile {
  picture: string;
  name: string;
  nickname: string;
  email: string;
  updatedAt?: string;
}

export type ThemeSetting = 'light' | 'dark' | 'system';
export type LayoutSetting = 'compact' | 'spacious';

export interface Settings {
  theme: ThemeSetting;
  layout: LayoutSetting;
  gpaFormat: '4.0' | '%';
  estimateTarget: string;
}
