import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import MfaProtectedRoute from '../components/routing/MfaProtectedRoute';
import RoleProtectedRoute from '../components/routing/RoleProtectedRoute';
import AuthFormRoute from '../components/routing/AuthFormRoute';
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
import AdminDashboardPage from '../pages/dashboard/admin/AdminDashboardPage';
import CreatorRequestsPage from '../pages/admin/CreatorRequestsPage';
import ElectionRequestsPage from '../pages/admin/ElectionRequestsPage';
import ApprovedElectionsPage from '../pages/admin/ApprovedElectionsPage';
import CreatorApprovalStatusPage from '../pages/creator/CreatorApprovalStatusPage';
import CreatorApprovalRoute from '../components/routing/CreatorApprovalRoute';
import ElectionListPage from '../pages/elections/ElectionListPage';
import CreatorDashboardPage from '../pages/dashboard/creator/CreatorDashboardPage';
import VoterDashboardPage from '../pages/dashboard/voter/VoterDashboardPage';
import ElectionFormPage from '../pages/elections/ElectionFormPage';
import ElectionViewPage from '../pages/elections/ElectionViewPage';
import CandidateModuleRedirect from '../pages/candidates/CandidateModuleRedirect';
import MyJoinedElectionsPage from '../pages/voters/MyJoinedElectionsPage';
import AdminFinalizedVotersPage from '../pages/finalization/AdminFinalizedVotersPage';
import AdminFinalizationDetailPage from '../pages/finalization/AdminFinalizationDetailPage';
import CreatorFinalizedVotersPage from '../pages/finalization/CreatorFinalizedVotersPage';
import CreatorFinalizationDetailPage from '../pages/finalization/CreatorFinalizationDetailPage';
import AdminSecretIdManagementPage from '../pages/secretid/AdminSecretIdManagementPage';
import AdminSecretIdElectionPage from '../pages/secretid/AdminSecretIdElectionPage';
import CreatorSecretIdManagementPage from '../pages/secretid/CreatorSecretIdManagementPage';
import CreatorSecretIdElectionPage from '../pages/secretid/CreatorSecretIdElectionPage';
import MySecretIdsPage from '../pages/voters/MySecretIdsPage';
import VoterVoteListPage from '../pages/voting/VoterVoteListPage';
import VoterElectionPollsPage from '../pages/voting/VoterElectionPollsPage';
import CastVotePage from '../pages/voting/CastVotePage';
import MyVotingHistoryPage from '../pages/voting/MyVotingHistoryPage';
import AdminResultsHistoryPage from '../pages/results/AdminResultsHistoryPage';
import AdminLiveResultsPage from '../pages/results/AdminLiveResultsPage';
import CreatorResultsHistoryPage from '../pages/results/CreatorResultsHistoryPage';
import CreatorLiveResultsPage from '../pages/results/CreatorLiveResultsPage';
import VoterResultsHistoryPage from '../pages/results/VoterResultsHistoryPage';
import VoterLiveResultsPage from '../pages/results/VoterLiveResultsPage';
import NotificationCenterPage from '../pages/notifications/NotificationCenterPage';
import VerifyEmail from '../pages/VerifyEmail';
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
              <AuthFormRoute>
                <RoleRequiredRoute>
                  <Login />
                </RoleRequiredRoute>
              </AuthFormRoute>
            }
          />
          <Route
            path={ROUTES.SIGNUP}
            element={
              <AuthFormRoute>
                <RoleRequiredRoute>
                  <SignupAllowedRoute>
                    <Signup />
                  </SignupAllowedRoute>
                </RoleRequiredRoute>
              </AuthFormRoute>
            }
          />
          <Route
            path={ROUTES.FORGOT_PASSWORD}
            element={
              <AuthFormRoute>
                <ForgotPassword />
              </AuthFormRoute>
            }
          />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
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
          <Route index element={<AdminDashboardPage />} />
          <Route path="requests" element={<CreatorRequestsPage />} />
          <Route path="election-requests" element={<ElectionRequestsPage />} />
          <Route path="approved-elections" element={<ApprovedElectionsPage />} />
          <Route
            path="finalized-voters"
            element={<AdminFinalizedVotersPage />}
          />
          <Route
            path="finalized-voters/:id"
            element={<AdminFinalizationDetailPage />}
          />
          <Route path="secret-ids" element={<AdminSecretIdManagementPage />} />
          <Route path="secret-ids/:id" element={<AdminSecretIdElectionPage />} />
          <Route path="results" element={<AdminResultsHistoryPage />} />
          <Route path="results/:id" element={<AdminLiveResultsPage />} />
          <Route path="notifications" element={<NotificationCenterPage />} />
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
            <Route index element={<CreatorDashboardPage />} />
            <Route path="elections" element={<ElectionListPage />} />
            <Route path="elections/new" element={<ElectionFormPage />} />
            <Route path="elections/:id" element={<ElectionViewPage />} />
            <Route path="elections/:id/edit" element={<ElectionFormPage />} />
            <Route path="candidates/*" element={<CandidateModuleRedirect />} />
            <Route
              path="finalized-voters"
              element={<CreatorFinalizedVotersPage />}
            />
            <Route
              path="finalized-voters/:id"
              element={<CreatorFinalizationDetailPage />}
            />
            <Route
              path="secret-ids"
              element={<CreatorSecretIdManagementPage />}
            />
            <Route
              path="secret-ids/:id"
              element={<CreatorSecretIdElectionPage />}
            />
            <Route path="results" element={<CreatorResultsHistoryPage />} />
            <Route path="results/:id" element={<CreatorLiveResultsPage />} />
            <Route path="notifications" element={<NotificationCenterPage />} />
          </Route>
        </Route>

        <Route
          path={ROUTES.VOTER_DASHBOARD}
          element={
            <ProtectedRoute>
              <MfaProtectedRoute>
                <RoleProtectedRoute allowedRoles={[USER_ROLES.VOTER]}>
                  <DashboardLayout title="Voter Dashboard" />
                </RoleProtectedRoute>
              </MfaProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<VoterDashboardPage />} />
          <Route
            path="joined-elections"
            element={<MyJoinedElectionsPage />}
          />
          <Route path="secret-ids" element={<MySecretIdsPage />} />
          <Route path="vote" element={<VoterVoteListPage />} />
          <Route path="vote/:electionId" element={<VoterElectionPollsPage />} />
          <Route
            path="vote/:electionId/:pollId"
            element={<CastVotePage />}
          />
          <Route path="voting-history" element={<MyVotingHistoryPage />} />
          <Route path="results" element={<VoterResultsHistoryPage />} />
          <Route path="results/:id" element={<VoterLiveResultsPage />} />
          <Route path="notifications" element={<NotificationCenterPage />} />
        </Route>

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
