// src/components/ProtectedRoute.jsx

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { loading, isLoggedIn, canAccessAdmin } = useAuth();

  if (loading) {
    return (
      <div className="screen">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRoles && !canAccessAdmin(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}