// Academic module registry (Round 12, 2026-10-27) — see docs/ACADEMIC_MODULES_API.md.
// An academic module is an official university module ("EEE 101 — Circuit
// Theory I") a course can optionally be tagged with. It has nothing to do
// with a course's own `modules` (its chapters).

export type AcademicModuleScope = "faculty" | "department";

/** `null`/absent department for a faculty-scoped module. */
export interface AcademicModule {
  id: number;
  code: string;
  title: string;
  /** Ready-to-render `"{code} — {title}"`. */
  label: string;
  scope: AcademicModuleScope;
  /** `false` = retired: courses that already have it keep showing it, but it can't be newly assigned. */
  is_active: boolean;
  university: { id: number; name: string } | null;
  faculty: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
}

export interface AcademicModuleFilters {
  /** That department's faculty-level modules plus its own. */
  department_id?: number;
  /** Only that faculty's faculty-level modules. */
  faculty_id?: number;
  /** Every module under the university (both scopes). */
  university_id?: number;
  scope?: AcademicModuleScope;
  search?: string;
  per_page?: number;
}
