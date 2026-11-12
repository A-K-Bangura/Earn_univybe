export interface University {
  id: number;
  name: string;
}

export interface Faculty {
  id: number;
  name: string;
  university_id: number;
}

export interface Department {
  id: number;
  name: string;
  faculty_id: number;
}

export interface Organization {
  id: number;
  name: string;
}

// Academic level type union
export type AcademicLevel =
  | "UnderGrad"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "graduate";

export interface OnboardingData {
  firstname: string;
  lastname: string;
  phone: string;
  university_id: number | null;
  faculty_id: number | null;
  department_id: number | null;
  organization_id: number | null;
  level: AcademicLevel;
  role: "student";
}

/** Local draft / form state may use "" for level until the user selects one */
export type OnboardingDraftLevel = AcademicLevel | "";

/** Everything the onboarding form holds in memory (includes the password pair). */
export interface OnboardingFormData
  extends Omit<OnboardingData, "level"> {
  level: OnboardingDraftLevel;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  student_id?: string;
  password?: string;
  password_confirmation?: string;
  bio?: string;
}

/**
 * The only fields written to the on-device draft. Deliberately excludes
 * `password`/`password_confirmation` (and anything else not needed to resume).
 */
export type OnboardingDraftFields = Pick<
  OnboardingFormData,
  | "firstname"
  | "lastname"
  | "phone"
  | "level"
  | "university_id"
  | "faculty_id"
  | "department_id"
  | "organization_id"
  | "student_id"
>;
