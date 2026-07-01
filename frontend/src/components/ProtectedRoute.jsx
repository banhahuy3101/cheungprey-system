import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { canAccess, isAdmin } from "../utils/permissions";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  feature = null,
}) {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!loading) {
    if (adminOnly && !isAdmin(user)) {
      return <Navigate to="/" replace />;
    }
    if (feature && !canAccess(user, feature)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
