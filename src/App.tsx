import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { PageShell } from "./components/layout/PageShell";
import { useUIStore } from "./store/uiStore";
import { HomeGate } from "./components/common/HomeGate";
import { CERTIFICATES_QUERY_KEY } from "./hooks/useCertificateCollection";
import { subscribeCertificateAccount } from "./utils/certificates/session";

// Lazy load pages for code splitting
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const Courses = lazy(() =>
  import("./pages/Courses").then((m) => ({ default: m.Courses }))
);
const Leaderboard = lazy(() =>
  import("./pages/Leaderboard").then((m) => ({ default: m.Leaderboard }))
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile }))
);
const Login = lazy(() =>
  import("./pages/Auth/Login").then((m) => ({ default: m.Login }))
);
const Signup = lazy(() =>
  import("./pages/Auth/Signup").then((m) => ({ default: m.Signup }))
);
const VerifyOtp = lazy(() =>
  import("./pages/Auth/VerifyOtp").then((m) => ({ default: m.VerifyOtp }))
);
const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((m) => ({ default: m.Onboarding }))
);
const CourseDetailPage = lazy(() =>
  import("./pages/CourseDetail").then((m) => ({ default: m.CourseDetailPage }))
);
const CoursePlayer = lazy(() =>
  import("./pages/CoursePlayer").then((m) => ({ default: m.CoursePlayer }))
);
const Feed = lazy(() =>
  import("./pages/Feed").then((m) => ({ default: m.Feed }))
);
const FeedShell = lazy(() =>
  import("./pages/FeedShell").then((m) => ({ default: m.FeedShell }))
);
const Opportunities = lazy(() =>
  import("./pages/Opportunities").then((m) => ({ default: m.Opportunities }))
);
const OpportunityDetail = lazy(() =>
  import("./pages/OpportunityDetail").then((m) => ({
    default: m.OpportunityDetail,
  }))
);
const Gigs = lazy(() => import("./pages/Gigs").then((m) => ({ default: m.Gigs })));
const GigDetail = lazy(() =>
  import("./pages/GigDetail").then((m) => ({ default: m.GigDetail }))
);
const GigInterests = lazy(() =>
  import("./pages/GigInterests").then((m) => ({ default: m.GigInterests }))
);
const PostedGigs = lazy(() =>
  import("./pages/PostedGigs").then((m) => ({ default: m.PostedGigs }))
);
const PostGigPage = lazy(() =>
  import("./pages/PostGigPage").then((m) => ({ default: m.PostGigPage }))
);
const PostedGigDetail = lazy(() =>
  import("./pages/PostedGigDetail").then((m) => ({
    default: m.PostedGigDetail,
  }))
);
const PostedGigApplicants = lazy(() =>
  import("./pages/PostedGigApplicants").then((m) => ({
    default: m.PostedGigApplicants,
  }))
);
const EnrolledCourses = lazy(() =>
  import("./pages/EnrolledCourses").then((m) => ({
    default: m.EnrolledCourses,
  }))
);
const Landing = lazy(() =>
  import("./pages/Landing").then((m) => ({ default: m.Landing }))
);
const Wallet = lazy(() =>
  import("./pages/Wallet").then((m) => ({ default: m.Wallet }))
);
const Roadmaps = lazy(() =>
  import("./pages/Roadmaps").then((m) => ({ default: m.Roadmaps }))
);
const RoadmapJourney = lazy(() =>
  import("./pages/RoadmapJourney").then((m) => ({ default: m.RoadmapJourney }))
);
const Resources = lazy(() =>
  import("./pages/Resources").then((m) => ({ default: m.Resources }))
);
const ResourceDetail = lazy(() =>
  import("./pages/ResourceDetail").then((m) => ({ default: m.ResourceDetail }))
);
const ResourcePurchases = lazy(() =>
  import("./pages/ResourcePurchases").then((m) => ({
    default: m.ResourcePurchases,
  }))
);
const Help = lazy(() => import("./pages/Help").then((m) => ({ default: m.Help })));
const CertificatesPage = lazy(() =>
  import("./pages/CertificatesPage").then((m) => ({ default: m.CertificatesPage }))
);
const CertificatePreviewPage = lazy(() =>
  import("./pages/CertificatePreviewPage").then((m) => ({
    default: m.CertificatePreviewPage,
  }))
);

// Loading fallback component
const LoadingFallback = () => (
  <PageShell>
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  </PageShell>
);

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Certificates carry a student's name. When the session ends or changes hands,
 * drop every cached certificate query (they're also keyed per account, so this
 * is memory hygiene on top of isolation).
 */
const CertificateSessionCleanup = () => {
  const client = useQueryClient();
  useEffect(
    () =>
      subscribeCertificateAccount(() => {
        client.removeQueries({ queryKey: [CERTIFICATES_QUERY_KEY] });
      }),
    [client]
  );
  return null;
};

function App() {
  const darkMode = useUIStore((state) => state.darkMode);

  // Apply dark mode to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OfflineIndicator />
          <CertificateSessionCleanup />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/verify" element={<VerifyOtp />} />

              {/* Protected Routes */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              {/* Public: guests can browse courses without an account */}
              <Route path="/courses" element={<Courses />} />
              <Route
                path="/courses/enrolled"
                element={
                  <ProtectedRoute requireOnboarding>
                    <EnrolledCourses />
                  </ProtectedRoute>
                }
              />
              {/* Public: guests can preview a course's full curriculum */}
              <Route path="/course/:courseId" element={<CourseDetailPage />} />
              {/* Alias for Monime's checkout-return redirect, which the
                  backend sends to {STUDENT_PORTAL_URL}/courses/{slug} (plural) */}
              <Route
                path="/courses/:courseId"
                element={<CourseDetailPage />}
              />
              <Route
                path="/course/:courseId/play"
                element={
                  <ProtectedRoute requireOnboarding>
                    <CoursePlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId/module/:moduleId/lesson/:lessonId"
                element={
                  <ProtectedRoute requireOnboarding>
                    <CoursePlayer />
                  </ProtectedRoute>
                }
              />
              {/* Public: guests can browse roadmaps (students also see their own progress) */}
              <Route path="/roadmaps" element={<Roadmaps />} />
              <Route path="/roadmaps/:roadmapId" element={<RoadmapJourney />} />
              {/* Public: guests can browse/read resources; opening/downloading needs an account */}
              <Route path="/resources" element={<Resources />} />
              <Route
                path="/resources/purchases"
                element={
                  <ProtectedRoute requireOnboarding>
                    <ResourcePurchases />
                  </ProtectedRoute>
                }
              />
              <Route path="/resources/:resourceId" element={<ResourceDetail />} />
              {/* Public: guests can read the feed, browse opportunities and
                  gigs without an account. The shell owns the tab row/swipe
                  and is the first nested layout route in this codebase — see
                  docs/DECISIONS.md. */}
              <Route path="/feed" element={<FeedShell />}>
                <Route index element={<Feed />} />
                <Route path="opportunities" element={<Opportunities />} />
                <Route path="gigs" element={<Gigs />} />
              </Route>
              <Route
                path="/feed/opportunities/:id"
                element={<OpportunityDetail />}
              />
              <Route
                path="/feed/gigs/interests"
                element={
                  <ProtectedRoute requireOnboarding>
                    <GigInterests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed/gigs/posted"
                element={
                  <ProtectedRoute requireOnboarding>
                    <PostedGigs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed/gigs/new"
                element={
                  <ProtectedRoute requireOnboarding>
                    <PostGigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed/gigs/posted/:id"
                element={
                  <ProtectedRoute requireOnboarding>
                    <PostedGigDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed/gigs/posted/:id/edit"
                element={
                  <ProtectedRoute requireOnboarding>
                    <PostGigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed/gigs/posted/:id/applicants"
                element={
                  <ProtectedRoute requireOnboarding>
                    <PostedGigApplicants />
                  </ProtectedRoute>
                }
              />
              <Route path="/feed/gigs/:id" element={<GigDetail />} />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/certificates"
                element={
                  <ProtectedRoute requireOnboarding>
                    <CertificatesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/certificates/:courseId"
                element={
                  <ProtectedRoute requireOnboarding>
                    <CertificatePreviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Wallet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/help"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Help />
                  </ProtectedRoute>
                }
              />

              {/* Root: dashboard for signed-in users, landing page for guests */}
              <Route path="/" element={<HomeGate guest={<Landing />} />} />
              <Route
                path="*"
                element={<HomeGate guest={<Navigate to="/" replace />} />}
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
