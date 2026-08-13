import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { canAccess, hasAnyFeature, isAdmin } from "../utils/permissions";
import Forbidden from "../pages/Forbidden";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  feature = null,
  action = null,
  features = null,
}) {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!loading) {
    if (adminOnly && !isAdmin(user)) {
      return <Forbidden />;
    }
    if (features?.length && !hasAnyFeature(user, features)) {
      return <Forbidden />;
    }
    if (feature && !canAccess(user, feature, action)) {
      return <Forbidden />;
    }
  }

  return children;
}
