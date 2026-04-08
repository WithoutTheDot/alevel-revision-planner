import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SubjectsProvider } from './contexts/SubjectsContext';
import { NudgeProvider } from './contexts/NudgeContext';
import { TutorialProvider } from './contexts/TutorialContext';
import TutorialOverlay from './components/TutorialOverlay';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import { analytics } from './firebase/config';

const LandingPage      = lazy(() => import('./pages/LandingPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const CalendarPage     = lazy(() => import('./pages/CalendarPage'));
const TermSchedulePage = lazy(() => import('./pages/TermSchedulePage'));
const TemplatesPage    = lazy(() => import('./pages/TemplatesPage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const HistoryPage      = lazy(() => import('./pages/HistoryPage'));
const ReviewPage       = lazy(() => import('./pages/ReviewPage'));
const GeneratePage     = lazy(() => import('./pages/GeneratePage'));
const OnboardingPage   = lazy(() => import('./pages/OnboardingPage'));
const ClassesPage      = lazy(() => import('./pages/ClassesPage'));
const LeaderboardPage  = lazy(() => import('./pages/LeaderboardPage'));
const BadgesPage       = lazy(() => import('./pages/BadgesPage'));
const AdminPage        = lazy(() => import('./pages/AdminPage'));

function PageLoader() {
  return <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">Loading…</div>;
}

function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    if (analytics) {
      import('firebase/analytics').then(({ logEvent }) => {
        logEvent(analytics, 'page_view', { page_path: location.pathname });
      }).catch(() => {});
    }
  }, [location.pathname]);
  return null;
}

/**
 * Redirects to /onboarding if the user is authenticated but hasn't finished onboarding.
 * For existing users with no profile doc, profile is null — we treat that as complete
 * (backward compatibility: they've been using the app before onboarding existed).
 */
function OnboardingGuard({ children }) {
  const { profile } = useAuth();
  // profile===null means either loading still (AuthProvider blocks until loaded) or
  // existing user with no profile doc → skip onboarding
  if (profile !== null && profile.onboardingComplete === false) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
      <Routes>
        {/* Admin — completely isolated from all app providers */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminPage />
              </Suspense>
            </AdminRoute>
          }
        />

        {/* All other routes wrapped in providers */}
        <Route
          path="*"
          element={
            <AuthProvider>
              <TimerProvider>
              <SubjectsProvider>
              <NudgeProvider>
              <TutorialProvider>
                <TutorialOverlay />
                <AnalyticsTracker />
                <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
                  <Route path="/login" element={<LoginPage />} />

                  <Route
                    path="/onboarding"
                    element={
                      <PrivateRoute>
                        <Suspense fallback={<PageLoader />}>
                          <OnboardingPage />
                        </Suspense>
                      </PrivateRoute>
                    }
                  />

                  <Route
                    element={
                      <PrivateRoute>
                        <OnboardingGuard>
                          <Layout />
                        </OnboardingGuard>
                      </PrivateRoute>
                    }
                  >
                    <Route path="/dashboard"        element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                    <Route path="/calendar"         element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
                    <Route path="/term-schedule"    element={<Suspense fallback={<PageLoader />}><TermSchedulePage /></Suspense>} />
                    <Route path="/templates"        element={<Suspense fallback={<PageLoader />}><TemplatesPage /></Suspense>} />
                    <Route path="/settings"         element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                    <Route path="/history"          element={<Suspense fallback={<PageLoader />}><HistoryPage /></Suspense>} />
                    <Route path="/review"           element={<Suspense fallback={<PageLoader />}><ReviewPage /></Suspense>} />
                    <Route path="/generate"         element={<Suspense fallback={<PageLoader />}><GeneratePage /></Suspense>} />
                    <Route path="/classes"          element={<Suspense fallback={<PageLoader />}><ClassesPage /></Suspense>} />
                    <Route path="/classes/:classId" element={<Suspense fallback={<PageLoader />}><LeaderboardPage /></Suspense>} />
                    <Route path="/badges"           element={<Suspense fallback={<PageLoader />}><BadgesPage /></Suspense>} />
                  </Route>
                </Routes>
                </ErrorBoundary>
              </TutorialProvider>
              </NudgeProvider>
              </SubjectsProvider>
              </TimerProvider>
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
