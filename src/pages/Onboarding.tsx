import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Phone,
  GraduationCap,
  AlertCircle,
  ChevronRight,
  Lock,
  Info,
} from "lucide-react";
import { completeOnboarding, getAuthProfile } from "../services/auth";
import type { OnboardingFormData } from "../types/onboarding";
import type { CompleteOnboardingData } from "../services/auth";
import { MascotInline, MascotStage } from "../components/auth/MascotCompanion";
import type { MascotPose } from "../components/common/Mascot";
import { BookOpen } from "lucide-react";
import { InstitutionField } from "../components/onboarding/InstitutionField";
import { MissingInstitutionDialog } from "../components/onboarding/MissingInstitutionDialog";
import { useInstitutionLookups } from "../hooks/useInstitutionLookups";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "../utils/onboardingDraft";
import {
  getOnboardingAccountId,
  isOnboardingComplete,
} from "../utils/onboardingSession";
import {
  isRegularLevel,
  isSpecialLevel,
  reachableStep,
  stepFieldMessage,
} from "../utils/onboardingValidation";
import {
  getSupportWhatsAppNumber,
  type MissingInstitutionKind,
} from "../utils/whatsapp";

const steps = [
  "Personal Info",
  "Academic Level",
  "Academic Details",
  "Account Setup",
];

// Vybe's pose and line for each step, matched to what the student is doing.
const stepMascots: Array<{ pose: MascotPose; message: string }> = [
  { pose: "hi", message: "Hi, I'm Vybe! Tell me a little about yourself." },
  { pose: "hat", message: "Which year are you in? I'll find courses that fit." },
  { pose: "smart", message: "Let's find your campus, faculty and department." },
  {
    pose: "secure",
    message: "Last step: pick a strong password to keep your account safe.",
  },
];

const EMPTY_FORM: OnboardingFormData = {
  firstname: "",
  lastname: "",
  phone: "",
  university_id: null,
  faculty_id: null,
  department_id: null,
  organization_id: null,
  level: "",
  role: "student",
  date_of_birth: "",
  gender: undefined,
  student_id: "",
  password: "",
  password_confirmation: "",
  bio: "",
};

type LookupState = "idle" | "loading" | "error" | "ready";

const lookupState = (
  query: { isError: boolean; isSuccess: boolean },
  parentReady: boolean
): LookupState => {
  if (!parentReady) return "idle";
  if (query.isError) return "error";
  return query.isSuccess ? "ready" : "loading";
};

export const Onboarding = () => {
  const navigate = useNavigate();

  // Which account this onboarding belongs to — the draft is scoped to it.
  const [accountId] = useState(() => getOnboardingAccountId());

  // Restore an interrupted onboarding (same account only). Done in the state
  // initialisers, not an effect, so the autosave below can never overwrite the
  // stored draft with the blank form before it has been read.
  const [restored] = useState(() => {
    const draft = loadOnboardingDraft(accountId);
    const data: OnboardingFormData = { ...EMPTY_FORM, ...draft?.fields };
    return { data, step: reachableStep(draft?.step ?? 0, data), found: !!draft };
  });
  const [currentStep, setCurrentStep] = useState(restored.step);
  const [formData, setFormData] = useState<OnboardingFormData>(restored.data);
  const [notice, setNotice] = useState<string | null>(
    restored.found
      ? "Welcome back — we saved your answers. Your password isn't stored, so you'll set it again at the end."
      : null
  );

  // Missing-institution help: which dialog is open, and what the student has
  // asked support to add (kept only to say when it shows up in the list).
  const [helpKind, setHelpKind] = useState<MissingInstitutionKind | null>(null);
  const [requests, setRequests] = useState<
    Partial<Record<MissingInstitutionKind, string>>
  >({});
  const supportNumber = getSupportWhatsAppNumber();

  const submitted = useRef(false);

  // Persist progress (never the password pair — see utils/onboardingDraft.ts).
  useEffect(() => {
    if (submitted.current) return;
    saveOnboardingDraft(accountId, currentStep, formData);
  }, [accountId, currentStep, formData]);

  // The server is the authority on whether onboarding is finished: a stale
  // local session/draft (e.g. onboarded on another device) must not trap the
  // student here. Failures are ignored so the form still works offline.
  const profile = useQuery({
    queryKey: ["onboarding-profile", accountId],
    queryFn: getAuthProfile,
    enabled: !!accountId,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const serverSaysComplete = isOnboardingComplete(profile.data?.user);
  useEffect(() => {
    if (!serverSaysComplete) return;
    submitted.current = true;
    clearOnboardingDraft(accountId);
    navigate("/dashboard", { replace: true });
  }, [serverSaysComplete, accountId, navigate]);

  const {
    universities,
    faculties,
    departments,
    organizations,
    universityConfirmed,
    facultyConfirmed,
    refreshUniversities,
    refreshFaculties,
    refreshDepartments,
  } = useInstitutionLookups({
    universityId: formData.university_id,
    facultyId: formData.faculty_id,
  });

  const regular = isRegularLevel(formData.level);
  const special = isSpecialLevel(formData.level);
  const departmentConfirmed =
    facultyConfirmed &&
    !!formData.department_id &&
    !!departments.data?.some((d) => d.id === formData.department_id);
  // Every regular-level selection must be confirmed against the current lists
  // (so a restored/stale id, or a faculty from another university, can't be
  // submitted). Organization is optional and checked separately below.
  const institutionsConfirmed =
    !regular || (universityConfirmed && facultyConfirmed && departmentConfirmed);
  const lookupFailed =
    universities.isError || faculties.isError || departments.isError;

  // Drop a selection that is no longer in the live list — and say so, rather
  // than leaving it submittable or silently picking something else.
  useEffect(() => {
    const clear = (what: string, patch: Partial<OnboardingFormData>) => {
      setFormData((prev) => ({ ...prev, ...patch }));
      setCurrentStep((step) => Math.min(step, 2));
      setNotice(
        `Your ${what} is no longer in the list, so we cleared it. Please choose it again.`
      );
    };
    if (regular) {
      if (
        universities.isSuccess &&
        formData.university_id &&
        !universities.data.some((u) => u.id === formData.university_id)
      ) {
        clear("university", {
          university_id: null,
          faculty_id: null,
          department_id: null,
        });
      } else if (
        faculties.isSuccess &&
        formData.faculty_id &&
        !faculties.data.some((f) => f.id === formData.faculty_id)
      ) {
        clear("faculty", { faculty_id: null, department_id: null });
      } else if (
        departments.isSuccess &&
        formData.department_id &&
        !departments.data.some((d) => d.id === formData.department_id)
      ) {
        clear("department", { department_id: null });
      }
    } else if (
      special &&
      organizations.isSuccess &&
      formData.organization_id &&
      !organizations.data.some((o) => o.id === formData.organization_id)
    ) {
      clear("organization", { organization_id: null });
    }
  }, [
    regular,
    special,
    formData.university_id,
    formData.faculty_id,
    formData.department_id,
    formData.organization_id,
    universities.isSuccess,
    universities.data,
    faculties.isSuccess,
    faculties.data,
    departments.isSuccess,
    departments.data,
    organizations.isSuccess,
    organizations.data,
  ]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      if (!data.level) {
        throw new Error("Level is required");
      }
      const level = data.level;
      // Convert to CompleteOnboardingData format
      const onboardingData: CompleteOnboardingData = {
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        level,
        password: data.password || "",
        password_confirmation: data.password_confirmation || "",
      };

      // Add optional fields
      if (data.date_of_birth) onboardingData.date_of_birth = data.date_of_birth;
      if (data.gender) onboardingData.gender = data.gender;
      if (data.bio) onboardingData.bio = data.bio;

      // Add fields based on level type
      if (isRegularLevel(level)) {
        // For levels 100-500: require university, faculty, department, student_id
        onboardingData.university_id = data.university_id as number;
        onboardingData.faculty_id = data.faculty_id as number;
        onboardingData.department_id = data.department_id as number;
        // Required for regular levels — validated at step 2, so this is
        // always non-empty by the time submit is reachable.
        onboardingData.student_id = data.student_id as string;
      } else if (isSpecialLevel(level)) {
        // For UnderGrad/graduate: organization is optional
        if (data.organization_id) {
          onboardingData.organization_id = data.organization_id as number;
        }
      }

      return completeOnboarding(onboardingData);
    },
    onSuccess: () => {
      submitted.current = true;
      clearOnboardingDraft(accountId);
      // User is now logged in (token moved from pending to main in completeOnboarding)
      navigate("/dashboard");
    },
  });

  const handleInputChange = (
    field: keyof OnboardingFormData | string,
    value: string | number | null | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const forgetRequests = (...kinds: MissingInstitutionKind[]) =>
    setRequests((prev) => {
      const next = { ...prev };
      kinds.forEach((kind) => delete next[kind]);
      return next;
    });

  const validateStep = (): boolean => {
    if (stepFieldMessage(currentStep, formData) !== null) return false;
    // Selections must also still exist, with the right parents, in the live
    // lists — checked at the last two steps so a restored draft can't skip it.
    if (currentStep >= 2 && !institutionsConfirmed) return false;
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Re-check at the moment of submit, not just when the button rendered.
    if (!validateStep() || submitted.current) return;
    submitMutation.mutate(formData);
  };

  const getValidationMessage = (): string | null => {
    const fieldMessage = stepFieldMessage(currentStep, formData);
    if (fieldMessage) return fieldMessage;
    if (currentStep === 3 && regular) {
      // Passwords are fine; the institutions are what's missing (e.g. a saved
      // selection was cleared). Step 3 can be reached straight from a draft.
      const academic = stepFieldMessage(2, formData);
      if (academic) return `${academic} — go Back to Academic Details.`;
    }
    if (currentStep >= 2 && !institutionsConfirmed) {
      return lookupFailed
        ? "We couldn't confirm your selections with the latest list. Use Retry on Academic Details."
        : "Confirming your selections with the latest list…";
    }
    return null;
  };

  const universityName =
    (universityConfirmed &&
      universities.data?.find((u) => u.id === formData.university_id)?.name) ||
    null;
  const facultyName =
    (facultyConfirmed &&
      faculties.data?.find((f) => f.id === formData.faculty_id)?.name) ||
    null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <MascotStage
          pose={stepMascots[currentStep].pose}
          message={stepMascots[currentStep].message}
          className="lg:sticky lg:top-8"
        />
        <div className="mx-auto w-full max-w-2xl">
          <MascotInline
            pose={stepMascots[currentStep].pose}
            message={stepMascots[currentStep].message}
          />
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Help us personalize your learning experience
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex-1 ${index < steps.length - 1 ? "mr-4" : ""}`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      index <= currentStep
                        ? "bg-azure-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        index < currentStep
                          ? "bg-azure-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`text-xs mt-2 text-center ${
                    index <= currentStep
                      ? "text-azure-500 font-semibold"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            {/* Step 1: Personal Info */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h2>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) =>
                        handleInputChange("firstname", e.target.value)
                      }
                      placeholder="Enter your first name"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.lastname}
                      onChange={(e) =>
                        handleInputChange("lastname", e.target.value)
                      }
                      placeholder="Enter your last name"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+232 76 123 4567"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Level */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Study Level
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Academic Level *
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.level}
                      onChange={(e) => {
                        const next = e.target.value as OnboardingFormData["level"];
                        // 100 -> 200 keeps the same university/faculty/department;
                        // switching between a university level and UnderGrad/graduate
                        // resets the academic fields, as before.
                        const sameKind =
                          (isRegularLevel(formData.level) && isRegularLevel(next)) ||
                          (isSpecialLevel(formData.level) && isSpecialLevel(next));
                        if (sameKind) {
                          handleInputChange("level", next);
                          return;
                        }
                        setFormData((prev) => ({
                          ...prev,
                          level: next,
                          university_id: null,
                          faculty_id: null,
                          department_id: null,
                          organization_id: null,
                          student_id: "",
                        }));
                        setRequests({});
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select your level</option>
                      <option value="UnderGrad">Undergraduate</option>
                      <option value="100">100 Level</option>
                      <option value="200">200 Level</option>
                      <option value="300">300 Level</option>
                      <option value="400">400 Level</option>
                      <option value="500">500 Level</option>
                      <option value="graduate">Graduate</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: University/Organization (conditional based on level) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Academic Information
                </h2>

                {/* For Regular Levels (100-500): Show University/Faculty/Department/Student ID */}
                {regular && (
                  <>
                    <InstitutionField
                      id="onboarding-university"
                      kind="university"
                      label="University"
                      noun="universities"
                      value={formData.university_id}
                      options={universities.data ?? []}
                      placeholder="Select a university"
                      idlePlaceholder="Select a university"
                      state={lookupState(universities, true)}
                      isFetching={universities.isFetching}
                      onChange={(id) => {
                        setFormData((prev) => ({
                          ...prev,
                          university_id: id,
                          // Dependent fields reset when their parent changes
                          faculty_id: null,
                          department_id: null,
                        }));
                        forgetRequests("faculty", "department");
                      }}
                      onRetry={() => universities.refetch()}
                      onRefresh={refreshUniversities}
                      onNeedHelp={() => setHelpKind("university")}
                      requestedName={requests.university}
                      emptyMessage="No universities are listed yet."
                    />

                    <InstitutionField
                      id="onboarding-faculty"
                      kind="faculty"
                      label="Faculty"
                      noun="faculties"
                      value={formData.faculty_id}
                      options={faculties.data ?? []}
                      placeholder="Select a faculty"
                      idlePlaceholder="Select a university first"
                      state={lookupState(
                        faculties,
                        universityConfirmed && !universities.isError
                      )}
                      isFetching={faculties.isFetching}
                      onChange={(id) => {
                        setFormData((prev) => ({
                          ...prev,
                          faculty_id: id,
                          department_id: null,
                        }));
                        forgetRequests("department");
                      }}
                      onRetry={() => faculties.refetch()}
                      onRefresh={refreshFaculties}
                      onNeedHelp={() => setHelpKind("faculty")}
                      requestedName={requests.faculty}
                      emptyMessage="No faculties are listed for this university yet."
                    />

                    <InstitutionField
                      id="onboarding-department"
                      kind="department"
                      label="Department"
                      noun="departments"
                      value={formData.department_id}
                      options={departments.data ?? []}
                      placeholder="Select a department"
                      idlePlaceholder="Select a faculty first"
                      state={lookupState(
                        departments,
                        facultyConfirmed && !faculties.isError
                      )}
                      isFetching={departments.isFetching}
                      onChange={(id) => handleInputChange("department_id", id)}
                      onRetry={() => departments.refetch()}
                      onRefresh={refreshDepartments}
                      onNeedHelp={() => setHelpKind("department")}
                      requestedName={requests.department}
                      emptyMessage="No departments are listed for this faculty yet."
                    />

                    {/* Student ID */}
                    <div>
                      <label
                        htmlFor="onboarding-student-id"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Student ID *
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="onboarding-student-id"
                          type="text"
                          value={formData.student_id || ""}
                          onChange={(e) =>
                            handleInputChange("student_id", e.target.value)
                          }
                          placeholder="Enter your student ID"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* For UnderGrad/Graduate Levels: Show Organization (optional) */}
                {isSpecialLevel(formData.level) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Organization (Optional)
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={formData.organization_id || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "organization_id",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none"
                      >
                        <option value="">
                          Select an organization (optional)
                        </option>
                        {(organizations.data ?? []).map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You can optionally associate with an organization
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Account Setup */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Account Setup
                </h2>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password || ""}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password_confirmation || ""}
                      onChange={(e) =>
                        handleInputChange("password_confirmation", e.target.value)
                      }
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Resume / stale-selection notice */}
            {notice && (
              <div
                role="status"
                className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3"
              >
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                  {notice}
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="bg-transparent p-0 text-sm font-semibold text-blue-700 dark:text-blue-300 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Validation Message */}
            {getValidationMessage() && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  {getValidationMessage()}
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitMutation.error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {submitMutation.error instanceof Error
                    ? submitMutation.error.message
                    : "An error occurred"}
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!validateStep() || submitMutation.isPending}
                className="px-6 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {submitMutation.isPending
                  ? "Submitting..."
                  : currentStep === steps.length - 1
                  ? "Complete"
                  : "Next"}{" "}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {helpKind && (
        <MissingInstitutionDialog
          key={helpKind}
          open
          kind={helpKind}
          onClose={() => setHelpKind(null)}
          supportNumber={supportNumber}
          universityId={formData.university_id}
          facultyId={formData.faculty_id}
          universityName={universityName}
          facultyName={facultyName}
          onOpenedWhatsApp={(kind, name) =>
            setRequests((prev) => ({ ...prev, [kind]: name }))
          }
        />
      )}
    </div>
  );
};