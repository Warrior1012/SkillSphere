import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { authApi } from './services/authApi.js';
import { setAccessToken, setUnauthorizedHandler } from './services/apiClient.js';
import { connectSocket, disconnectSocket } from './services/socket.js';
import { setUser, setStatus, clearAuth } from './features/auth/authSlice.js';

import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { ProtectedRoute, RoleRoute } from './components/RouteGuards.jsx';
import { Spinner } from './components/ui.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage.jsx';

import ClientDashboard from './pages/dashboard/ClientDashboard.jsx';
import FreelancerDashboard from './pages/dashboard/FreelancerDashboard.jsx';
import AdminDashboard from './pages/dashboard/AdminDashboard.jsx';

import ProfilePage from './pages/profile/ProfilePage.jsx';
import EditProfilePage from './pages/profile/EditProfilePage.jsx';
import SecuritySettingsPage from './pages/settings/SecuritySettingsPage.jsx';

import GigMarketplacePage from './pages/gigs/GigMarketplacePage.jsx';
import GigDetailPage from './pages/gigs/GigDetailPage.jsx';
import CreateGigPage from './pages/gigs/CreateGigPage.jsx';
import MyGigsPage from './pages/gigs/MyGigsPage.jsx';
import MyProposalsPage from './pages/gigs/MyProposalsPage.jsx';
import MessagesPage from './pages/messages/MessagesPage.jsx';
import PaymentsPage from './pages/payments/PaymentsPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import FlaggedReviewsPage from './pages/admin/FlaggedReviewsPage.jsx';
import AdminDisputesPage from './pages/admin/AdminDisputesPage.jsx';

function RoleDashboard() {
  const { user } = useSelector((s) => s.auth);
  if (user?.role === 'freelancer') return <FreelancerDashboard />;
  if (user?.role === 'admin') return <AdminDashboard />;
  return <ClientDashboard />;
}

export default function App() {
  const dispatch = useDispatch();
  const { status } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(clearAuth());
      disconnectSocket();
      navigate('/login');
    });
  }, [dispatch, navigate]);

  useEffect(() => {
    dispatch(setStatus('loading'));
    authApi
      .refresh()
      .then((res) => {
        setAccessToken(res.data.accessToken);
        dispatch(setUser(res.data.user));
        connectSocket(res.data.accessToken);
      })
      .catch(() => {
        dispatch(clearAuth());
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'idle' || status === 'loading') return <Spinner />;

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<RoleDashboard />} />
          <Route path="/gigs" element={<GigMarketplacePage />} />
          <Route path="/gigs/new" element={<CreateGigPage />} />
          <Route path="/gigs/mine" element={<MyGigsPage />} />
          <Route path="/proposals/mine" element={<MyProposalsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/flagged-reviews" element={<FlaggedReviewsPage />} />
            <Route path="/admin/disputes" element={<AdminDisputesPage />} />
          </Route>
          <Route path="/gigs/:id" element={<GigDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/settings/security" element={<SecuritySettingsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
