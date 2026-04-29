import { Navigate } from "react-router-dom";

function AdminRoute({ session, isSystemAdmin, adminLoading, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (adminLoading) {
    return <div style={{ padding: "24px" }}>管理者権限を確認中...</div>;
  }

  if (!isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;