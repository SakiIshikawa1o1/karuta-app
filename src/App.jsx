// src/App.jsx

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ApprovalPendingPage from "./pages/ApprovalPendingPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TournamentListPage from "./pages/TournamentListPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import TournamentApplyPage from "./pages/TournamentApplyPage";
import ApplicationConfirmPage from "./pages/ApplicationConfirmPage";
import ApplicationStatusPage from "./pages/ApplicationStatusPage";
import MyPage from "./pages/MyPage";
import NoticesPage from "./pages/NoticesPage";
import { ContactPage } from "./pages/SupportPages";

import { ROLE } from "./utils/roles";

const SystemAdminPage = lazy(() => import("./pages/SystemAdminPage"));
const TournamentAdminPage = lazy(() => import("./pages/TournamentAdminPage"));
const TournamentCreatePage = lazy(() => import("./pages/TournamentCreatePage"));
const TournamentEditPage = lazy(() => import("./pages/TournamentEditPage"));
const ApplicationAdminPage = lazy(() => import("./pages/ApplicationAdminPage"));
const AffiliationApprovalPage = lazy(() => import("./pages/AffiliationApprovalPage"));

export default function App() {
  return (
    <div className="app">
      <Header />

      <main className="page">
        <Suspense fallback={<div className="page-loading">読み込み中...</div>}>
          <Routes>
          {/* ログイン前でも閲覧できるページ */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/approval-pending" element={<ApprovalPendingPage />} />
          <Route path="/tournaments" element={<TournamentListPage />} />
          <Route path="/notices" element={<NoticesPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* ログイン必須ページ */}
          <Route
            path="/tournaments/:id"
            element={
              <ProtectedRoute>
                <TournamentDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournaments/:id/apply"
            element={
              <ProtectedRoute>
                <TournamentApplyPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournaments/:id/confirm"
            element={
              <ProtectedRoute>
                <ApplicationConfirmPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/status"
            element={
              <ProtectedRoute>
                <ApplicationStatusPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />

          {/* システム管理者 */}
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute allowedRoles={[ROLE.SYSTEM_ADMIN]}>
                <SystemAdminPage />
              </ProtectedRoute>
            }
          />

          {/* 大会管理者 */}
          <Route
            path="/admin/tournament"
            element={
              <ProtectedRoute allowedRoles={[ROLE.TOURNAMENT_ADMIN]}>
                <TournamentAdminPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tournament/new"
            element={
              <ProtectedRoute allowedRoles={[ROLE.TOURNAMENT_ADMIN]}>
                <TournamentCreatePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tournament/edit"
            element={
              <ProtectedRoute allowedRoles={[ROLE.TOURNAMENT_ADMIN]}>
                <TournamentEditPage />
              </ProtectedRoute>
            }
          />

          {/* 申込管理者 */}
          <Route
            path="/admin/application"
            element={
              <ProtectedRoute allowedRoles={[ROLE.APPLICATION_ADMIN]}>
                <ApplicationAdminPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/affiliation-approvals"
            element={
              <ProtectedRoute>
                <AffiliationApprovalPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
