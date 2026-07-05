import { useState, useEffect, useCallback } from "react";
import { LuTrendingUp, LuTrendingDown, LuWallet, LuChartNoAxesColumnIncreasing } from "react-icons/lu";
import { financesAPI } from "../../../api/finances";
import { useAuth } from "../../../hooks/useAuth";
import { isAdmin as checkIsAdmin } from "../../../utils/permissions";
import ZoneCascadeSelect from "../../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../../hooks/useZoneCascade";
import FinanceHero from "../../../components/finances/FinanceHero";
import { FMS_FISCAL_YEARS, formatFMSUSD, progressClass } from "../../../utils/finances";

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
      const { data } = await financesAPI.getDashboard({
        zone_code: zone.resolvedZone || undefined,
        fiscal_year: fiscalYear,
      });
      setDashboard(data.data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [zone.resolvedZone, fiscalYear]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const s = dashboard?.summary || {};
  const budgets = dashboard?.budget_vs_actual || [];
  const monthly = dashboard?.monthly || [];
  const byAccount = dashboard?.by_account || [];
  const maxMonthly = Math.max(1, ...monthly.map((m) => Math.max(m.income || 0, m.expense || 0)));

  const cardData = [
    { label: "ចំណូលសរុប", usd: s.total_income_usd, khr: s.total_income_khr, icon: LuTrendingUp, variant: "income" },
    { label: "ចំណាយសរុប", usd: s.total_expense_usd, khr: s.total_expense_khr, icon: LuTrendingDown, variant: "expense" },
    { label: "សមតុល្យ", usd: s.balance_usd, khr: s.balance_khr, icon: LuWallet, variant: "balance" },
  ];

  return (
    <div className="page fms-page fms-page-dashboard">
      <FinanceHero
        variant="dashboard"
        title="ផ្ទាំងគ្រប់គ្រងហិរញ្ញវត្ថុ"
        subtitle="ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុស្រុកជើងព្រៃ"
        actions={
          <>
            <div className="form-group fms-year-group">
              <label>ឆ្នាំ</label>
              <select className="fms-year-select" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}>
                {FMS_FISCAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        }
      />

      <div className="card fms-zone-bar">
        <label className="fms-section-label">តំបន់</label>
        <ZoneCascadeSelect hook={zone} />
      </div>

      {loading ? (
        <div className="fms-kpi-grid fms-loading-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card fms-skeleton-card"><div className="skeleton-line" /><div className="skeleton-line skeleton-line-lg" /></div>
          ))}
        </div>
      ) : (
        <>
          <div className="fms-kpi-grid">
            {cardData.map((c) => (
              <div key={c.label} className={`fms-kpi-card fms-kpi-${c.variant}`}>
                <div className="fms-kpi-icon"><c.icon size={22} /></div>
                <div className="fms-kpi-body">
                  <span className="fms-kpi-value">{formatFMSUSD(c.usd)}</span>
                  <span className="fms-kpi-label">{c.label}</span>
                  {c.khr > 0 && (
                    <span className="fms-kpi-khr">{(c.khr || 0).toLocaleString()} ៛</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {budgets.length > 0 && (
            <section className="card fms-section-card">
              <div className="fms-panel-header">
                <h3 className="fms-panel-title"><LuChartNoAxesColumnIncreasing className="fms-panel-icon" /> ថវិកា vs ការអនុវត្ត</h3>
                <span className="fms-panel-meta">{budgets.length} គណនី</span>
              </div>
              <div className="table-responsive fms-table-wrap">
                <table className="table fms-table">
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
                        <td>{formatFMSUSD(b.allocated)}</td>
                        <td className="fms-amount-expense">{formatFMSUSD(b.spent)}</td>
                        <td className="fms-amount-income">{formatFMSUSD(b.remaining)}</td>
                        <td>
                          <div className="fms-progress">
                            <div className="fms-progress-track">
                              <div className={`fms-progress-fill ${progressClass(b.used_pct)}`} style={{ width: `${Math.min(b.used_pct, 100)}%` }} />
                            </div>
                            <span className="fms-progress-label">{b.used_pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="fms-grid-2">
            <section className="card fms-section-card">
              <h3 className="fms-section-title">តាមខែ</h3>
              {monthly.length === 0 ? (
                <div className="fms-empty-state"><p>គ្មានទិន្នន័យ</p></div>
              ) : (
                <div className="fms-monthly-chart">
                  {monthly.map((m, i) => (
                    <div key={i} className="fms-month-row">
                      <span className="fms-month-label">{m.month}</span>
                      <div className="fms-month-bars">
                        <div className="fms-month-bar income" style={{ width: `${((m.income || 0) / maxMonthly) * 100}%` }} title={`ចំណូល ${formatFMSUSD(m.income)}`} />
                        <div className="fms-month-bar expense" style={{ width: `${((m.expense || 0) / maxMonthly) * 100}%` }} title={`ចំណាយ ${formatFMSUSD(m.expense)}`} />
                      </div>
                      <span className="fms-month-balance">{formatFMSUSD(m.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card fms-section-card">
              <h3 className="fms-section-title">តាមគណនី</h3>
              <div className="table-responsive fms-table-wrap">
                <table className="table fms-table fms-table-compact">
                  <thead><tr><th>គណនី</th><th>សរុប</th></tr></thead>
                  <tbody>
                    {byAccount.length === 0 ? (
                      <tr><td colSpan={2} className="fms-empty">គ្មានទិន្នន័យ</td></tr>
                    ) : byAccount.map((a, i) => (
                      <tr key={i}>
                        <td>{a.account_name_kh || a.account_code}</td>
                        <td>{formatFMSUSD(a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
