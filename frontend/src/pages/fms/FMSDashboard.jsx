import { useState, useEffect, useCallback } from "react";
import { LuTrendingUp, LuTrendingDown, LuWallet, LuRefreshCw } from "react-icons/lu";
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

  const s = dashboard?.summary || {};
  const budgets = dashboard?.budget_vs_actual || [];
  const monthly = dashboard?.monthly || [];
  const byAccount = dashboard?.by_account || [];

  const cardData = [
    { label: "ចំណូលសរុប", usd: s.total_income_usd, khr: s.total_income_khr, icon: LuTrendingUp, className: "card-income" },
    { label: "ចំណាយសរុប", usd: s.total_expense_usd, khr: s.total_expense_khr, icon: LuTrendingDown, className: "card-expense" },
    { label: "សមតុល្យ", usd: s.balance_usd, khr: s.balance_khr, icon: LuWallet, className: "card-balance" },
  ];

  return (
    <div className="page fms-page">
      <div className="fms-hero">
        <div className="fms-hero-text">
          <h2 className="fms-hero-title">FMS ផ្ទាំងគ្រប់គ្រង</h2>
          <p className="fms-hero-sub">ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុស្រុកជើងព្រៃ</p>
        </div>
        <div className="fms-hero-actions">
          <select className="fms-year-select" value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ZoneCascadeSelect hook={zone} />
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboard} disabled={loading}>
            <LuRefreshCw className={`${loading ? "spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="fms-loading-skeleton">
          <div className="summary-cards">
            {[1, 2, 3].map(i => (
              <div key={i} className="card fms-skeleton-card"><div className="skeleton-line" /><div className="skeleton-line skeleton-line-lg" /></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="summary-cards">
            {cardData.map((c, i) => (
              <div key={i} className={`card ${c.className}`}>
                <div className="fms-card-header">
                  <h3>{c.label}</h3>
                  <c.icon size={24} />
                </div>
                <p className="fms-card-amount">${(c.usd || 0).toLocaleString()}</p>
                <p className="fms-card-amount-khr">{((c.khr || 0) / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} KHR</p>
              </div>
            ))}
          </div>

          {budgets.length > 0 && (
            <div className="card">
              <h2 className="fms-section-title">ថវិកា vs ការអនុវត្ត</h2>
              <div className="table-responsive">
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
                        <td><strong>{b.account_name_kh || b.account_code}</strong></td>
                        <td>${b.allocated.toLocaleString()}</td>
                        <td className="fms-amount-expense">${b.spent.toLocaleString()}</td>
                        <td className="fms-amount-income">${b.remaining.toLocaleString()}</td>
                        <td>
                          <div className="fms-progress">
                            <div className="fms-progress-track">
                              <div className="fms-progress-fill" style={{ width: `${Math.min(b.used_pct, 100)}%` }} />
                            </div>
                            <span className="fms-progress-label">{b.used_pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="fms-grid-2">
            <div className="card">
              <h2 className="fms-section-title">តាមខែ</h2>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr><th>ខែ</th><th>ចំណូល</th><th>ចំណាយ</th><th>សមតុល្យ</th></tr>
                  </thead>
                  <tbody>
                    {monthly.length === 0 ? (
                      <tr><td colSpan={4} className="fms-empty">គ្មានទិន្នន័យ</td></tr>
                    ) : monthly.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td className="fms-amount-income">${m.income.toLocaleString()}</td>
                        <td className="fms-amount-expense">${m.expense.toLocaleString()}</td>
                        <td>${m.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 className="fms-section-title">តាមគណនី</h2>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr><th>គណនី</th><th>សរុប</th></tr>
                  </thead>
                  <tbody>
                    {byAccount.length === 0 ? (
                      <tr><td colSpan={2} className="fms-empty">គ្មានទិន្នន័យ</td></tr>
                    ) : byAccount.map((a, i) => (
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
        </>
      )}
    </div>
  );
}
