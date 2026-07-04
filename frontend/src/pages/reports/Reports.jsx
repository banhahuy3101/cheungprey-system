import { useNavigate, useParams, useLocation } from "react-router-dom";
import ReportList from "../../components/ReportList";
import ReportForm from "../../components/ReportForm";
import ReportTemplates from "../../components/ReportTemplates";

export default function Reports() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  if (location.pathname.endsWith("/templates")) {
    return <ReportTemplates />;
  }

  let mode = "list";
  if (location.pathname.includes("/reports/create")) {
    mode = "create";
  } else if (location.pathname.endsWith("/edit")) {
    mode = "edit";
  } else if (id) {
    mode = "view";
  }

  if (mode === "list") {
    return (
      <ReportList
        onView={(reportId) => navigate(`/reports/${reportId}`)}
        onEdit={(reportId) => navigate(`/reports/${reportId}/edit`)}
        onCreate={() => navigate("/reports/create")}
        onTemplates={() => navigate("/reports/templates")}
      />
    );
  }

  return <ReportForm mode={mode} reportId={mode === "create" ? undefined : id} />;
}
