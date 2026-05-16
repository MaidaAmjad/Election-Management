import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import MfaProtectedRoute from '../components/routing/MfaProtectedRoute';
import RoleProtectedRoute from '../components/routing/RoleProtectedRoute';
import GuestRoute from '../components/routing/GuestRoute';
import RoleRequiredRoute from '../components/routing/RoleRequiredRoute';
import Home from '../pages/Home';
import RoleSelection from '../pages/RoleSelection';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import VerifyEmail from '../pages/VerifyEmail';
import VerifyMfa from '../pages/VerifyMfa';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Settings from '../pages/Settings';
import AdminDashboard from '../pages/AdminDashboard';
import CreatorDashboard from '../pages/CreatorDashboard';
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
          <Route path={ROUTES.HOME} element={<Home />} />
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
                  <Signup />
                </RoleRequiredRoute>
              </GuestRoute>
            }
          />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
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

        {dashboardRoute(
          ROUTES.ADMIN_DASHBOARD,
          [USER_ROLES.SUPER_ADMIN],
          'Admin Dashboard',
          AdminDashboard,
        )}

        {dashboardRoute(
          ROUTES.CREATOR_DASHBOARD,
          [USER_ROLES.ELECTION_CREATOR],
          'Creator Dashboard',
          CreatorDashboard,
        )}

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
