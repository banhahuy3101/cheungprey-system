import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Voters from "./pages/Voters";
import Finances from "./pages/Finances";
import Files from "./pages/Files";
import Records from "./pages/Records";
import Reports from "./pages/Reports";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";
import SettingsPeriod from "./pages/SettingsPeriod";
import SettingsPeriodForm from "./pages/SettingsPeriodForm";
import SettingsPerformance from "./pages/SettingsPerformance";
import SettingsRolePermissions from "./pages/SettingsRolePermissions";
import SettingsTechnical from "./pages/settings/SettingsTechnical";
import SettingsSystem from "./pages/settings/SettingsSystem";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import { FEATURES } from "./utils/permissions";

function FeatureRoute({ feature, children }) {
  return <ProtectedRoute feature={feature}>{children}</ProtectedRoute>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<Profile />} />
            <Route index element={<Dashboard />} />

            <Route path="members" element={<FeatureRoute feature={FEATURES.members}><Members /></FeatureRoute>} />
            <Route path="voters" element={<FeatureRoute feature={FEATURES.voters}><Voters /></FeatureRoute>} />
            <Route path="finances" element={<FeatureRoute feature={FEATURES.finances}><Finances /></FeatureRoute>} />
            <Route path="files" element={<FeatureRoute feature={FEATURES.files}><Files /></FeatureRoute>} />
            <Route path="records" element={<FeatureRoute feature={FEATURES.records}><Records /></FeatureRoute>} />
            <Route path="reports" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="reports/templates" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="reports/create" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="reports/:id/edit" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="reports/:id" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="performance" element={<FeatureRoute feature={FEATURES.performance}><Performance /></FeatureRoute>} />
            <Route path="performance/create" element={<FeatureRoute feature={FEATURES.performance}><Performance /></FeatureRoute>} />
            <Route path="performance/edit" element={<FeatureRoute feature={FEATURES.performance}><Performance /></FeatureRoute>} />
            <Route path="performance/:id" element={<FeatureRoute feature={FEATURES.performance}><Performance /></FeatureRoute>} />

            <Route path="settings" element={<FeatureRoute feature={FEATURES.settings}><Settings /></FeatureRoute>} />
            <Route path="settings/users" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="settings/role-permissions" element={<ProtectedRoute adminOnly><SettingsRolePermissions /></ProtectedRoute>} />
            <Route path="settings/technical" element={<ProtectedRoute feature={FEATURES.technical}><SettingsTechnical /></ProtectedRoute>} />
            <Route path="settings/technical/system" element={<ProtectedRoute feature={FEATURES.technical}><SettingsSystem /></ProtectedRoute>} />
            <Route path="settings/performance_period" element={<ProtectedRoute feature={FEATURES.performance_admin}><SettingsPeriod /></ProtectedRoute>} />
            <Route path="settings/performance_period/create" element={<ProtectedRoute feature={FEATURES.performance_admin}><SettingsPeriodForm /></ProtectedRoute>} />
            <Route path="settings/performance" element={<ProtectedRoute feature={FEATURES.performance_admin}><SettingsPerformance /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
