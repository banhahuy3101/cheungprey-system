import { useNavigate, useParams, useLocation } from "react-router-dom";
import ReportList from "../../components/ReportList";
import ReportCreateForm from "../../components/reports/ReportCreateForm";
import ReportDetail from "../../components/reports/ReportDetail";
export default function Reports() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  let mode = "list";
  if (location.pathname.includes("/reports/create")) {
    mode = "create";
  } else if (location.pathname.endsWith("/edit")) {
    mode = "edit";
  } else if (id) {
    mode = "view";
  }

  if (mode === "create") {
    return <ReportCreateForm />;
  }

  if (mode === "list") {
    return (
      <ReportList
        onView={(reportId) => navigate(`/reports/${reportId}`)}
        onEdit={(reportId) => navigate(`/reports/${reportId}/edit`)}
        onCreate={() => navigate("/reports/create")}
      />
    );
  }

  return <ReportDetail mode={mode} reportId={id} />;
}
