import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import DomainManager from "./settings/DomainManager";
import SubDomainManager from "./settings/SubDomainManager";
import IndicatorManager from "./settings/IndicatorManager";
import PeriodManager from "./settings/PeriodManager";
import TabErrorBoundary from "./settings/TabErrorBoundary";

const TABS = [
  { key: "domains", label: "ដែន (Domains)" },
  { key: "subdomains", label: "ចំណុចរង (Sub-Domains)" },
  { key: "indicators", label: "សូចនាករ (Indicators)" },
  { key: "periods", label: "រយៈពេល (Periods)" },
];

export default function SettingsPerformance() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("domains");

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">ការកំណត់ Performance</h2>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.5rem 1.25rem",
              border: tab === t.key ? "2px solid var(--primary)" : "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: tab === t.key ? "var(--primary)" : "var(--surface)",
              color: tab === t.key ? "#fff" : "var(--text)",
              cursor: "pointer",
              fontWeight: tab === t.key ? 600 : 400,
              fontSize: "0.9rem",
              transition: "all 0.15s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "domains" && <TabErrorBoundary><DomainManager /></TabErrorBoundary>}
      {tab === "subdomains" && <TabErrorBoundary><SubDomainManager /></TabErrorBoundary>}
      {tab === "indicators" && <TabErrorBoundary><IndicatorManager /></TabErrorBoundary>}
      {tab === "periods" && <TabErrorBoundary><PeriodManager /></TabErrorBoundary>}
    </div>
  );
}
