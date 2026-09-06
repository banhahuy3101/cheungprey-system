import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import AuthProvider from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import MembershipCreate from "./pages/membership/MembershipCreate";
import MembershipEdit from "./pages/membership/MembershipEdit";
import Membership from "./pages/membership/Membership";
import Voters from "./pages/voters/Voters";
import Files from "./pages/files/Files";
import Reports from "./pages/reports/Reports";
import Performance from "./pages/performance/Performance";
import Settings from "./pages/settings/Settings";
import SettingsPeriod from "./pages/settings/SettingsPeriod";
import SettingsPeriodForm from "./pages/settings/SettingsPeriodForm";
import SettingsPerformance from "./pages/settings/SettingsPerformance";
import SettingsRolePermissions from "./pages/settings/SettingsRolePermissions";
import SettingsTechnical from "./pages/settings/SettingsTechnical";
import SettingsSystem from "./pages/settings/SettingsSystem";
import SettingsReportTemplates from "./pages/settings/SettingsReportTemplates";
import SettingsReportTemplateCreate from "./pages/settings/SettingsReportTemplateCreate";
import SettingsReportTemplateDetail from "./pages/settings/SettingsReportTemplateDetail";
import SettingsReportTemplateEdit from "./pages/settings/SettingsReportTemplateEdit";
import SettingsZoneChief from "./pages/settings/SettingsZoneChief";
import ModuleSettings from "./pages/settings/ModuleSettings";
import SettingsCron from "./pages/settings/SettingsCron";
import SettingsMenuItems from "./pages/settings/SettingsMenuItems";
import SettingsMenuItemForm from "./pages/settings/SettingsMenuItemForm";
import Forbidden from "./pages/Forbidden";
import ReportCreateFromTemplate from "./pages/reports/ReportCreateFromTemplate";
import Sponsorships from "./pages/sponsorships/Sponsorships";
import SponsorItemPage from "./pages/sponsorships/SponsorItemPage";
import SponsorshipFormPage from "./pages/sponsorships/SponsorshipFormPage";
import SponsorshipAppendixReport from "./pages/sponsorships/SponsorshipAppendixReport";
import Admin from "./pages/admin/Admin";
import UserCreate from "./pages/admin/UserCreate";
import UserEdit from "./pages/admin/UserEdit";
import Profile from "./pages/profile/Profile";
import { FEATURES } from "./utils/permissions";

function FeatureRoute({ feature, action = "read", children }) {
  return <ProtectedRoute feature={feature} action={action}>{children}</ProtectedRoute>;
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

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
              <Route path="membership/create" element={<FeatureRoute feature={FEATURES.members} action="create"><MembershipCreate /></FeatureRoute>} />
              <Route path="membership/registrations/:registrationId/edit" element={<FeatureRoute feature={FEATURES.members}><MembershipCreate /></FeatureRoute>} />
              <Route path="membership/import" element={<FeatureRoute feature={FEATURES.membership_write} action={null}><Membership /></FeatureRoute>} />
              <Route path="membership/stats" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
              <Route path="membership/:id" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
              <Route path="membership/:id/edit" element={<FeatureRoute feature={FEATURES.members} action="update"><MembershipEdit /></FeatureRoute>} />
              <Route path="membership/:id/demographics" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
              <Route path="membership/:id/dues" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
              <Route path="membership/:id/activity" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
              <Route path="membership/:id/positions" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />
              <Route path="membership/:id/cards" element={<FeatureRoute feature={FEATURES.members}><Membership /></FeatureRoute>} />

              <Route path="voters" element={<FeatureRoute feature={FEATURES.voters}><Voters /></FeatureRoute>} />

              <Route path="files" element={<FeatureRoute feature={FEATURES.files}><Files /></FeatureRoute>} />
              <Route path="reports" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
              <Route path="reports/create" element={<FeatureRoute feature={FEATURES.reports} action="create"><Reports /></FeatureRoute>} />
              <Route path="reports/create-template" element={<FeatureRoute feature={FEATURES.reports} action="create"><ReportCreateFromTemplate /></FeatureRoute>} />
              <Route path="reports/:id/edit" element={<FeatureRoute feature={FEATURES.reports} action="update"><Reports /></FeatureRoute>} />
              <Route path="reports/:id" element={<FeatureRoute feature={FEATURES.reports}><Reports /></FeatureRoute>} />
              <Route path="performance" element={<FeatureRoute feature={FEATURES.performance}><Performance /></FeatureRoute>} />
              <Route path="performance/create" element={<FeatureRoute feature={FEATURES.performance} action="create"><Performance /></FeatureRoute>} />
              <Route path="performance/edit" element={<FeatureRoute feature={FEATURES.performance} action="update"><Performance /></FeatureRoute>} />
              <Route path="performance/:id" element={<FeatureRoute feature={FEATURES.performance}><Performance /></FeatureRoute>} />

              <Route path="sponsorships" element={<FeatureRoute feature={FEATURES.sponsorships}><Sponsorships /></FeatureRoute>} />
              <Route path="sponsorships/items/:periodId/create" element={<FeatureRoute feature={FEATURES.sponsorships} action="create"><SponsorshipFormPage /></FeatureRoute>} />
              <Route path="sponsorships/items/:periodId/edit/:id" element={<FeatureRoute feature={FEATURES.sponsorships} action="update"><SponsorshipFormPage /></FeatureRoute>} />
              <Route path="sponsorships/items/:id" element={<FeatureRoute feature={FEATURES.sponsorships}><SponsorItemPage /></FeatureRoute>} />
              <Route path="sponsorships/sponsor-item/:id" element={<FeatureRoute feature={FEATURES.sponsorships}><SponsorItemPage /></FeatureRoute>} />
              <Route path="sponsorships/appendix" element={<FeatureRoute feature={FEATURES.sponsorships}><SponsorshipAppendixReport /></FeatureRoute>} />
              <Route path="sponsorships/:id" element={<FeatureRoute feature={FEATURES.sponsorships}><SponsorItemPage /></FeatureRoute>} />

              <Route path="settings" element={<FeatureRoute feature={FEATURES.settings}><Settings /></FeatureRoute>} />
              <Route path="settings/users" element={<ProtectedRoute adminOnly feature={FEATURES.users} action="read"><Admin /></ProtectedRoute>} />
              <Route path="settings/users/create" element={<ProtectedRoute adminOnly feature={FEATURES.users} action="create"><UserCreate /></ProtectedRoute>} />
              <Route path="settings/users/:id/edit" element={<ProtectedRoute adminOnly feature={FEATURES.users} action="update"><UserEdit /></ProtectedRoute>} />
              <Route path="settings/role-permissions" element={<ProtectedRoute adminOnly feature={FEATURES.users} action="read"><SettingsRolePermissions /></ProtectedRoute>} />
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
              <Route path="settings/zone-chiefs" element={<ProtectedRoute adminOnly><SettingsZoneChief /></ProtectedRoute>} />
              <Route path="settings/modules" element={<ProtectedRoute features={[FEATURES.technical, FEATURES.users]}><ModuleSettings /></ProtectedRoute>} />
              <Route path="settings/modules/workflow" element={<ProtectedRoute features={[FEATURES.technical, FEATURES.users]}><ModuleSettings /></ProtectedRoute>} />
              <Route path="settings/menu-items" element={<ProtectedRoute features={[FEATURES.technical, FEATURES.users]}><SettingsMenuItems /></ProtectedRoute>} />
              <Route path="settings/menu-items/create" element={<ProtectedRoute features={[FEATURES.technical, FEATURES.users]}><SettingsMenuItemForm /></ProtectedRoute>} />
              <Route path="settings/menu-items/edit" element={<ProtectedRoute features={[FEATURES.technical, FEATURES.users]}><SettingsMenuItemForm /></ProtectedRoute>} />
              <Route path="settings/menu-items/:id/edit" element={<ProtectedRoute features={[FEATURES.technical, FEATURES.users]}><SettingsMenuItemForm /></ProtectedRoute>} />
              <Route path="settings/cron" element={<ProtectedRoute feature={FEATURES.settings}><SettingsCron /></ProtectedRoute>} />
              <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              <Route path="403" element={<Forbidden />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
