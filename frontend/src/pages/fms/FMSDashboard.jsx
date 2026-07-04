import { useState, useEffect, useCallback } from "react";
import { fmsAPI } from "../../api/fms";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin as checkIsAdmin } from "../../utils/permissions";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../hooks/useZoneCascade";

export default function FMSDashboard() {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const userZone = user?.zone_code || "";

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fmsAPI.getDashboard({
        zone_code: zone.selectedZone || undefined,
        fiscal_year: fiscalYear,
      });
      setDashboard(data.data);
    } catch { setDashboard(null) }
    setLoading(false);
  }, [zone.selectedZone, fiscalYear]);

  useEffect(() => { fetchDashboard() }, [fetchDashboard]);

  if (loading) return <div className="loading">កំពុងផ្ទុក...</div>;

  const s = dashboard?.summary || {};
  const budgets = dashboard?.budget_vs_actual || [];
  const monthly = dashboard?.monthly || [];
  const byAccount = dashboard?.by_account || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>FMS ផ្ទាំងគ្រប់គ្រង</h1>
        <div className="page-actions">
          <select value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ZoneCascadeSelect hook={zone} />
        </div>
      </div>

      <div className="summary-cards">
        <div className="card card-income">
          <h3>ចំណូល</h3>
          <p className="amount">${(s.total_income_usd || 0).toLocaleString()}</p>
        </div>
        <div className="card card-expense">
          <h3>ចំណាយ</h3>
          <p className="amount">${(s.total_expense_usd || 0).toLocaleString()}</p>
        </div>
        <div className="card card-balance">
          <h3>សមតុល្យ</h3>
          <p className="amount">${(s.balance_usd || 0).toLocaleString()}</p>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="card">
          <h2>ថវិកា vs ការអនុវត្ត</h2>
          <table className="table">
            <thead>
              <tr>
                <th>គណនី</th>
                <th>ថវិកា</th>
                <th>បានចំណាយ</th>
                <th>នៅសល់</th>
                <th>ប្រើប្រាស់</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b, i) => (
                <tr key={i}>
                  <td>{b.account_name_kh || b.account_code}</td>
                  <td>${b.allocated.toLocaleString()}</td>
                  <td>${b.spent.toLocaleString()}</td>
                  <td>${b.remaining.toLocaleString()}</td>
                  <td>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(b.used_pct, 100)}%` }} />
                      <span>{b.used_pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h2>តាមខែ</h2>
          <table className="table">
            <thead>
              <tr><th>ខែ</th><th>ចំណូល</th><th>ចំណាយ</th><th>សមតុល្យ</th></tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => (
                <tr key={i}>
                  <td>{m.month}</td>
                  <td>${m.income.toLocaleString()}</td>
                  <td>${m.expense.toLocaleString()}</td>
                  <td>${m.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>តាមគណនី</h2>
          <table className="table">
            <thead>
              <tr><th>គណនី</th><th>សរុប</th></tr>
            </thead>
            <tbody>
              {byAccount.map((a, i) => (
                <tr key={i}>
                  <td>{a.account_name_kh || a.account_code}</td>
                  <td>${a.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
