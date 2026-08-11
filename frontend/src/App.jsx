import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import AuthProvider from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import MembershipCreate from "./pages/membership/MembershipCreate";
import Membership from "./pages/membership/Membership";
import Voters from "./pages/voters/Voters";
import Files from "./pages/files/Files";
import Records from "./pages/records/Records";
import Reports from "./pages/reports/Reports";
import Performance from "./pages/performance/Performance";
import Settings from "./pages/Settings";
import SettingsPeriod from "./pages/SettingsPeriod";
import SettingsPeriodForm from "./pages/SettingsPeriodForm";
import SettingsPerformance from "./pages/SettingsPerformance";
import SettingsRolePermissions from "./pages/SettingsRolePermissions";
import SettingsTechnical from "./pages/settings/SettingsTechnical";
import SettingsSystem from "./pages/settings/SettingsSystem";
import SettingsReportTemplates from "./pages/settings/SettingsReportTemplates";
import SettingsReportTemplateCreate from "./pages/settings/SettingsReportTemplateCreate";
import SettingsReportTemplateDetail from "./pages/settings/SettingsReportTemplateDetail";
import SettingsReportTemplateEdit from "./pages/settings/SettingsReportTemplateEdit";
import ReportCreateFromTemplate from "./pages/reports/ReportCreateFromTemplate";
import Admin from "./pages/admin/Admin";
import Profile from "./pages/profile/Profile";
import { FEATURES } from "./utils/permissions";

function FeatureRoute({ feature, children }) {
  return <ProtectedRoute feature={feature}>{children}</ProtectedRoute>;
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute keepLayout>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<Profile />} />
            <Route index element={<Dashboard />} />

            <Route path="membership" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/create" element={<FeatureRoute feature={FEATURES.members}><MembershipCreate /></FeatureRoute>} />
            <Route path="membership/import" element={<FeatureRoute feature={FEATURES.membership_write}><Membership /></FeatureRoute>} />
            <Route path="membership/stats" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id/edit" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id/demographics" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id/dues" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id/activity" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id/positions" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
            <Route path="membership/:id/cards" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />

            <Route path="voters" element={<FeatureRoute feature={FEATURES.voters}><Voters /></FeatureRoute>} />

            <Route path="files" element={<FeatureRoute feature={FEATURES.files}><Files /></FeatureRoute>} />
            <Route path="records" element={<FeatureRoute feature={FEATURES.records}><Records /></FeatureRoute>} />
            <Route path="reports" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="reports/create" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
            <Route path="reports/create-template" element={<FeatureRoute feature={FEATURES.reports}><ReportCreateFromTemplate /></FeatureRoute>} />
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
            <Route path="settings/performance_period/:id/edit" element={<ProtectedRoute feature={FEATURES.performance_admin}><SettingsPeriodForm /></ProtectedRoute>} />
            <Route path="settings/performance" element={<ProtectedRoute feature={FEATURES.performance_admin}><SettingsPerformance /></ProtectedRoute>} />
            <Route path="settings/report-templates" element={<ProtectedRoute feature={FEATURES.reports}><SettingsReportTemplates /></ProtectedRoute>} />
            <Route path="settings/report-templates/new" element={<ProtectedRoute feature={FEATURES.reports}><SettingsReportTemplateCreate /></ProtectedRoute>} />
            <Route path="settings/report-templates/:id/edit" element={<ProtectedRoute feature={FEATURES.reports}><SettingsReportTemplateEdit /></ProtectedRoute>} />
            <Route path="settings/report-templates/:id" element={<ProtectedRoute feature={FEATURES.reports}><SettingsReportTemplateDetail /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
