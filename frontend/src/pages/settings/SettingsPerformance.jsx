import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuTarget } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import DomainManager from "./DomainManager";
import SubDomainManager from "./SubDomainManager";
import IndicatorManager from "./IndicatorManager";
import PeriodManager from "./PeriodManager";
import TabErrorBoundary from "./TabErrorBoundary";

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
      <PageHeader
        showBack={() => navigate("/settings")}
        title="គ្រប់គ្រង Performance"
        subtitle="គ្រប់គ្រងដែន ចំណុចរង សូចនាករ និងរយៈពេលសមិទ្ធកម្ម"
        icon={<LuTarget size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "Performance" },
        ]}
      />

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
