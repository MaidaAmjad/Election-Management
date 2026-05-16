import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import GuestRoute from '../components/routing/GuestRoute';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import AdminDashboard from '../pages/AdminDashboard';
import CreatorDashboard from '../pages/CreatorDashboard';
import VoterDashboard from '../pages/VoterDashboard';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
import { ROUTES, USER_ROLES } from '../utils/constants';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route
            path={ROUTES.LOGIN}
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path={ROUTES.SIGNUP}
            element={
              <GuestRoute>
                <Signup />
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
        </Route>

        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
              <DashboardLayout title="Admin Dashboard" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>

        <Route
          path={ROUTES.CREATOR_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ELECTION_CREATOR]}>
              <DashboardLayout title="Creator Dashboard" />
            </ProtectedRoute>
          }
        >
          <Route index element={<CreatorDashboard />} />
        </Route>

        <Route
          path={ROUTES.VOTER_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.VOTER]}>
              <DashboardLayout title="Voter Dashboard" />
            </ProtectedRoute>
          }
        >
          <Route index element={<VoterDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
