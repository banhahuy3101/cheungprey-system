import { LuTrendingUp, LuTrendingDown, LuCoins } from "react-icons/lu";
import { formatUSD } from "../utils/finance";

function ZoneBarIncome({ label, amount, maxTotal }) {
  const widthPct = maxTotal > 0 ? (amount / maxTotal) * 100 : 0;
  return (
    <div className="finance-zone-bar">
      <div className="finance-zone-bar-head">
        <span className="finance-zone-bar-label">{label}</span>
        <span className="finance-amount-income">{formatUSD(amount)}</span>
      </div>
      <div className="finance-zone-bar-track finance-zone-bar-track-single" style={{ width: `${Math.max(widthPct, 8)}%` }}>
        <div className="finance-zone-bar-income" style={{ width: "100%" }} />
      </div>
    </div>
  );
}

function ZoneBarExpense({ label, amount, maxTotal }) {
  const widthPct = maxTotal > 0 ? (amount / maxTotal) * 100 : 0;
  return (
    <div className="finance-zone-bar">
      <div className="finance-zone-bar-head">
        <span className="finance-zone-bar-label">{label}</span>
        <span className="finance-amount-expense">{formatUSD(amount)}</span>
      </div>
      <div className="finance-zone-bar-track finance-zone-bar-track-single" style={{ width: `${Math.max(widthPct, 8)}%` }}>
        <div className="finance-zone-bar-expense" style={{ width: "100%" }} />
      </div>
    </div>
  );
}

export default function FinanceSummaryPanel({ summary, mode = "income" }) {
  if (!summary) return null;

  const isExpense = mode === "expense";
  const primaryTotal = isExpense ? summary.total_expense : summary.total_income;
  const PrimaryIcon = isExpense ? LuTrendingDown : LuTrendingUp;
  const primaryColor = isExpense ? "#dc2626" : "#059669";
  const primaryBg = isExpense ? "#fef2f2" : "#ecfdf5";
  const primaryLabel = isExpense ? "ចំណាយសរុប" : "ចំណូលសរុប";

  const zoneAmount = (z) => (isExpense ? z.total_expense : z.total_income) || 0;
  const maxZoneTotal = Math.max(0, ...(summary.by_zone || []).map(zoneAmount));

  return (
    <>
      <div className="finance-kpi-grid finance-kpi-grid-split">
        <div className="finance-kpi-card finance-kpi-card-primary">
          <div className="finance-kpi-icon" style={{ background: primaryBg, color: primaryColor }}>
            <PrimaryIcon size={22} />
          </div>
          <div className="finance-kpi-body">
            <span className="finance-kpi-value" style={{ color: primaryColor }}>{formatUSD(primaryTotal)}</span>
            <span className="finance-kpi-label">{primaryLabel}</span>
          </div>
        </div>
        <div className="finance-kpi-card">
          <div className="finance-kpi-icon" style={{ background: "#f1f5f9", color: "#64748b" }}>
            <span className="finance-kpi-count">{summary.by_type ? Object.keys(summary.by_type).length : 0}</span>
          </div>
          <div className="finance-kpi-body">
            <span className="finance-kpi-value" style={{ color: "#334155", fontSize: "1.1rem" }}>
              {(summary.by_zone || []).length}
            </span>
            <span className="finance-kpi-label">តំបន់មាន{isExpense ? "ចំណាយ" : "ចំណូល"}</span>
          </div>
        </div>
        {summary.total_khr > 0 && (
          <div className="finance-kpi-card">
            <div className="finance-kpi-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
              <LuCoins size={22} />
            </div>
            <div className="finance-kpi-body">
              <span className="finance-kpi-value" style={{ color: "#d97706" }}>
                {Number(summary.total_khr).toLocaleString()} ៛
              </span>
              <span className="finance-kpi-label">KHR សរុប</span>
            </div>
          </div>
        )}
      </div>

      {summary.by_zone?.length > 0 && (
        <div className="card finance-panel mb-1">
          <div className="finance-panel-header">
            <h3 className="finance-panel-title">
              {isExpense ? "ចំណាយតាមតំបន់" : "ចំណូលតាមតំបន់"}
            </h3>
            <span className="finance-panel-meta">{summary.by_zone.length} តំបន់</span>
          </div>
          <div className="finance-zone-grid finance-zone-grid-split">
            <div className="finance-zone-bars">
              {summary.by_zone
                .filter((z) => zoneAmount(z) > 0)
                .slice(0, 8)
                .map((z) =>
                  isExpense ? (
                    <ZoneBarExpense
                      key={z.zone_code}
                      label={z.zone_name_kh || z.zone_code}
                      amount={zoneAmount(z)}
                      maxTotal={maxZoneTotal}
                    />
                  ) : (
                    <ZoneBarIncome
                      key={z.zone_code}
                      label={z.zone_name_kh || z.zone_code}
                      amount={zoneAmount(z)}
                      maxTotal={maxZoneTotal}
                    />
                  )
                )}
            </div>
            <div className="table-responsive finance-zone-table-wrap">
              <table className="table finance-table-compact">
                <thead>
                  <tr>
                    <th>តំបន់</th>
                    <th>{isExpense ? "ចំណាយ" : "ចំណូល"}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_zone
                    .filter((z) => zoneAmount(z) > 0)
                    .map((z) => (
                      <tr key={z.zone_code}>
                        <td>{z.zone_name_kh || z.zone_code}</td>
                        <td className={isExpense ? "finance-amount-expense" : "finance-amount-income"}>
                          {formatUSD(zoneAmount(z))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
