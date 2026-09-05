import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { canAccess, hasAnyFeature, isAdmin, getModuleForFeature } from "../utils/permissions";
import { useModules } from "../hooks/useModules";
import Forbidden from "../pages/Forbidden";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  feature = null,
  action = null,
  features = null,
  module = null,
}) {
  const { user, loading } = useAuth();
  const { isEnabled } = useModules();

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!loading) {
    const moduleKey = module || getModuleForFeature(feature);
    if (moduleKey && !isEnabled(moduleKey)) {
      return <Navigate to="/" replace />;
    }

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
