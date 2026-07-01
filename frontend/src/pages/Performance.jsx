import { useNavigate, useParams, useLocation } from "react-router-dom";
import PerformanceForm from "../components/PerformanceForm";
import PerformanceList from "../components/PerformanceList";

export default function Performance() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  let mode = "list";
  let zoneCode = "";
  let periodId = "";

  if (location.pathname.endsWith("/create")) {
    mode = "create";
  } else if (location.pathname.endsWith("/edit")) {
    const sp = new URLSearchParams(location.search);
    zoneCode = sp.get("zone_id") || "";
    periodId = sp.get("period_id") || "";
    mode = "edit";
  } else if (id) {
    const parts = id.split("_");
    zoneCode = parts[0] || "";
    periodId = parts.slice(1).join("_") || "";
    mode = "view";
  }

  if (mode === "list") {
    return (
      <PerformanceList
        onView={(zc, pid) => navigate(`/performance/${zc}_${pid}`)}
        onEdit={(zc, pid) => navigate(`/performance/edit?zone_id=${zc}&period_id=${pid}`)}
        onCreate={() => navigate("/performance/create")}
      />
    );
  }

  return (
    <PerformanceForm
      mode={mode}
      zoneCode={zoneCode}
      periodId={periodId}
    />
  );
}