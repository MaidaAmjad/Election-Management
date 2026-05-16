import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import MfaProtectedRoute from '../components/routing/MfaProtectedRoute';
import RoleProtectedRoute from '../components/routing/RoleProtectedRoute';
import GuestRoute from '../components/routing/GuestRoute';
import RoleRequiredRoute from '../components/routing/RoleRequiredRoute';
import SignupAllowedRoute from '../components/routing/SignupAllowedRoute';
import LandingPage from '../pages/public/LandingPage';
import PublicElectionsPage from '../pages/public/PublicElectionsPage';
import PublicElectionDetailPage from '../pages/public/PublicElectionDetailPage';
import AboutPage from '../pages/public/AboutPage';
import ContactPage from '../pages/public/ContactPage';
import RoleSelection from '../pages/RoleSelection';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import VerifyMfa from '../pages/VerifyMfa';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Settings from '../pages/Settings';
import AdminOverviewPage from '../pages/admin/AdminOverviewPage';
import CreatorRequestsPage from '../pages/admin/CreatorRequestsPage';
import ApprovedElectionsPage from '../pages/admin/ApprovedElectionsPage';
import ActivityLogsPage from '../pages/admin/ActivityLogsPage';
import CreatorApprovalStatusPage from '../pages/creator/CreatorApprovalStatusPage';
import CreatorApprovalRoute from '../components/routing/CreatorApprovalRoute';
import ElectionListPage from '../pages/elections/ElectionListPage';
import ElectionFormPage from '../pages/elections/ElectionFormPage';
import ElectionViewPage from '../pages/elections/ElectionViewPage';
import VoterDashboard from '../pages/VoterDashboard';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
import { ROUTES, USER_ROLES } from '../utils/constants';

function dashboardRoute(path, allowedRoles, title, Page) {
  return (
    <Route
      path={path}
      element={
        <ProtectedRoute>
          <MfaProtectedRoute>
            <RoleProtectedRoute allowedRoles={allowedRoles}>
              <DashboardLayout title={title} />
            </RoleProtectedRoute>
          </MfaProtectedRoute>
        </ProtectedRoute>
      }
    >
      <Route index element={<Page />} />
    </Route>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route path={ROUTES.PUBLIC_ELECTIONS} element={<PublicElectionsPage />} />
          <Route
            path={`${ROUTES.PUBLIC_ELECTIONS}/:id`}
            element={<PublicElectionDetailPage />}
          />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.CONTACT} element={<ContactPage />} />
          <Route path={ROUTES.CHOOSE_ROLE} element={<RoleSelection />} />
          <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route
            path={ROUTES.LOGIN}
            element={
              <GuestRoute>
                <RoleRequiredRoute>
                  <Login />
                </RoleRequiredRoute>
              </GuestRoute>
            }
          />
          <Route
            path={ROUTES.SIGNUP}
            element={
              <GuestRoute>
                <RoleRequiredRoute>
                  <SignupAllowedRoute>
                    <Signup />
                  </SignupAllowedRoute>
                </RoleRequiredRoute>
              </GuestRoute>
            }
          />
          <Route
            path={ROUTES.FORGOT_PASSWORD}
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route
            path={ROUTES.VERIFY_MFA}
            element={
              <ProtectedRoute>
                <VerifyMfa />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={
            <ProtectedRoute>
              <MfaProtectedRoute>
                <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
                  <DashboardLayout title="Super Admin Dashboard" />
                </RoleProtectedRoute>
              </MfaProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="requests" element={<CreatorRequestsPage />} />
          <Route path="approved-elections" element={<ApprovedElectionsPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
        </Route>

        <Route
          path={ROUTES.CREATOR_DASHBOARD}
          element={
            <ProtectedRoute>
              <MfaProtectedRoute>
                <RoleProtectedRoute allowedRoles={[USER_ROLES.ELECTION_CREATOR]}>
                  <DashboardLayout title="Election Creator Dashboard" />
                </RoleProtectedRoute>
              </MfaProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route path="pending" element={<CreatorApprovalStatusPage />} />
          <Route
            path="rejected"
            element={<CreatorApprovalStatusPage variant="rejected" />}
          />
          <Route element={<CreatorApprovalRoute />}>
            <Route index element={<ElectionListPage />} />
            <Route path="elections/new" element={<ElectionFormPage />} />
            <Route path="elections/:id" element={<ElectionViewPage />} />
            <Route path="elections/:id/edit" element={<ElectionFormPage />} />
          </Route>
        </Route>

        {dashboardRoute(
          ROUTES.VOTER_DASHBOARD,
          [USER_ROLES.VOTER],
          'Voter Dashboard',
          VoterDashboard,
        )}

        <Route
          path={ROUTES.SETTINGS}
          element={
            <ProtectedRoute>
              <MfaProtectedRoute>
                <DashboardLayout title="Account settings" />
              </MfaProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
