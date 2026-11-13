import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, clearPrivateData } from './services/queryClient';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { HomeGate } from './components/common/HomeGate';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { FeaturePage } from './components/layout/FeaturePage';
import { DiscoverEntry } from './components/common/DiscoverEntry';
import { useUIStore } from './store/uiStore';
const Discover = lazy(() => import('./pages/Discover').then(m => ({ default: m.Discover })));
const Opportunities = lazy(() => import('./pages/Opportunities').then(m => ({ default: m.Opportunities })));
const OpportunityDetail = lazy(() => import('./pages/OpportunityDetail').then(m => ({ default: m.OpportunityDetail })));
const Gigs = lazy(() => import('./pages/Gigs').then(m => ({ default: m.Gigs })));
const GigDetail = lazy(() => import('./pages/GigDetail').then(m => ({ default: m.GigDetail })));
const GigInterests = lazy(() => import('./pages/GigInterests').then(m => ({ default: m.GigInterests })));
const PostedGigs = lazy(() => import('./pages/PostedGigs').then(m => ({ default: m.PostedGigs })));
const PostGigPage = lazy(() => import('./pages/PostGigPage').then(m => ({ default: m.PostGigPage })));
const PostedGigDetail = lazy(() => import('./pages/PostedGigDetail').then(m => ({ default: m.PostedGigDetail })));
const PostedGigApplicants = lazy(() => import('./pages/PostedGigApplicants').then(m => ({ default: m.PostedGigApplicants })));
const Feed = lazy(() => import('./pages/Feed').then(m => ({ default: m.Feed })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Transition = lazy(() => import('./pages/Transition').then(m => ({ default: m.Transition })));
const Login = lazy(() => import('./pages/Auth/Login').then(m => ({default:m.Login})));
const Signup = lazy(() => import('./pages/Auth/Signup').then(m => ({default:m.Signup})));
const VerifyOtp = lazy(() => import('./pages/Auth/VerifyOtp').then(m => ({default:m.VerifyOtp})));
function LegacyRoute() { const location = useLocation(); return <Navigate replace to={location.pathname.replace(/^\/feed\/(opportunities|gigs)/, '/$1') + location.search + location.hash}/>; }
function ScrollToTop() { const { pathname } = useLocation(); const type = useNavigationType(); useEffect(() => { if (type !== 'POP') window.scrollTo(0, 0); }, [pathname, type]); return null; }
function AccountBoundary() { useEffect(() => { const update = (event: StorageEvent) => { if (['auth_token','pending_auth_token','user','pending_user',null].includes(event.key)) void clearPrivateData().finally(() => window.location.reload()); }; window.addEventListener('storage', update); return () => window.removeEventListener('storage', update); }, []); return null; }
function App() {
 const dark = useUIStore(s => s.darkMode);
 useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
 useEffect(() => { if (typeof caches !== 'undefined') void caches.delete('api-cache'); }, []);
 return <ErrorBoundary><QueryClientProvider client={queryClient}><BrowserRouter><ScrollToTop/><AccountBoundary/><OfflineIndicator/><Suspense fallback={<div role="status" className="p-10 text-center">Loading UniVybe Earn…</div>}><Routes>
 <Route path="/auth/help" element={<FeaturePage title="Need help signing in?" description="Password recovery is not available in Earn yet. Use the email verification flow for your existing UniVybe account, or visit UniVybe Learn for support."><a className="earn-button" href="https://univybesl.com">Go to UniVybe Learn ↗</a></FeaturePage>}/><Route path="/auth/login" element={<Login/>}/><Route path="/auth/signup" element={<Signup/>}/><Route path="/auth/verify" element={<VerifyOtp/>}/>
 <Route path="/onboarding" element={<ProtectedRoute><Onboarding/></ProtectedRoute>}/>
 <Route path="/discover" element={<DiscoverEntry guest={<Landing/>}><Discover/></DiscoverEntry>}/>
 <Route path="/opportunities" element={<FeaturePage title="Opportunities" description="Explore scholarships, internships, programmes and more."><Opportunities/></FeaturePage>}/>
 <Route path="/opportunities/:id" element={<OpportunityDetail/>}/>
 <Route path="/gigs" element={<FeaturePage title="Gigs" description="Put your skills to work, find a small job or post one of your own."><Gigs/></FeaturePage>}/>
 <Route path="/gigs/new" element={<ProtectedRoute requireOnboarding><PostGigPage/></ProtectedRoute>}/><Route path="/gigs/interests" element={<ProtectedRoute requireOnboarding><GigInterests/></ProtectedRoute>}/><Route path="/gigs/posted" element={<ProtectedRoute requireOnboarding><PostedGigs/></ProtectedRoute>}/><Route path="/gigs/posted/:id" element={<ProtectedRoute requireOnboarding><PostedGigDetail/></ProtectedRoute>}/><Route path="/gigs/posted/:id/edit" element={<ProtectedRoute requireOnboarding><PostGigPage/></ProtectedRoute>}/><Route path="/gigs/posted/:id/applicants" element={<ProtectedRoute requireOnboarding><PostedGigApplicants/></ProtectedRoute>}/><Route path="/gigs/:id" element={<GigDetail/>}/>
 <Route path="/feed" element={<FeaturePage title="Community" description="Ideas, conversations and updates from UniVybe."><Feed/></FeaturePage>}/>
 <Route path="/feed/:postId" element={<FeaturePage title="Community post"><Feed/></FeaturePage>}/>
 <Route path="/profile" element={<ProtectedRoute requireOnboarding><Profile/></ProtectedRoute>}/><Route path="/help" element={<ProtectedRoute requireOnboarding><Help/></ProtectedRoute>}/>
 <Route path="/feed/opportunities/*" element={<LegacyRoute/>}/><Route path="/feed/gigs/*" element={<LegacyRoute/>}/>
 <Route path="/dashboard" element={<Navigate to="/discover" replace/>}/>
 <Route path="/courses/*" element={<Transition learning/>}/>
<Route path="/course/*" element={<Transition learning/>}/>
<Route path="/resources/*" element={<Transition learning/>}/>
<Route path="/roadmaps/*" element={<Transition learning/>}/>
<Route path="/leaderboard" element={<Transition learning/>}/>
<Route path="/wallet" element={<Transition learning/>}/>
<Route path="/profile/certificates/*" element={<Transition learning/>}/>
 <Route path="/" element={<HomeGate guest={<Landing/>}/>}/><Route path="*" element={<Transition/>}/>
 </Routes></Suspense></BrowserRouter></QueryClientProvider></ErrorBoundary>;
}
export default App;
