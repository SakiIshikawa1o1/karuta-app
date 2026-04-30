// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TournamentListPage from "./pages/TournamentListPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import TournamentApplyPage from "./pages/TournamentApplyPage";
import ApplicationConfirmPage from "./pages/ApplicationConfirmPage";
import ApplicationStatusPage from "./pages/ApplicationStatusPage";
import MyPage from "./pages/MyPage";
import SystemAdminPage from "./pages/SystemAdminPage";
import TournamentAdminPage from "./pages/TournamentAdminPage";
import TournamentCreatePage from "./pages/TournamentCreatePage";
import TournamentEditPage from "./pages/TournamentEditPage";
import ApplicationAdminPage from "./pages/ApplicationAdminPage";
import NoticesPage from "./pages/NoticesPage";

import { ROLE } from "./utils/roles";

export default function App() {
  return (
    <div className="app">
      <Header />

      <main className="page">
        <Routes>
          {/* ログイン前でも閲覧できるページ */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/tournaments" element={<TournamentListPage />} />
          <Route path="/notices" element={<NoticesPage />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}