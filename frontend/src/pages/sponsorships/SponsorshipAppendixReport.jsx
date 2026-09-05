import { useState, useEffect, Fragment } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LuPrinter, LuArrowLeft } from "react-icons/lu";
import { sponsorshipAPI } from "../../api/sponsorship";
import {
  toKhmerDigits,
  numberToKhmerWords,
  getKhmerSolarDate,
  getKhmerLunarHeaderDate,
} from "../../utils/khmerNumberSpelling";
import { groupSponsorshipsBySection } from "../../utils/sponsorshipUtils";
import "../../style/sponsorships.css";

export default function SponsorshipAppendixReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const periodParam = searchParams.get("period") || "";
  const sectionParam = searchParams.get("section") || "";
  const locationParam = searchParams.get("location") || "";

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [listRes, summaryRes] = await Promise.all([
          sponsorshipAPI.list({
            record_period: periodParam || undefined,
            section_group: sectionParam || undefined,
            target_location: locationParam || undefined,
            limit: 2000,
          }),
          sponsorshipAPI.getSummary({
            record_period: periodParam || undefined,
            section_group: sectionParam || undefined,
            target_location: locationParam || undefined,
          }),
        ]);

        const list = listRes.data?.data || [];
        setRecords(list);
        setSummary(summaryRes.data?.data || null);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [periodParam, sectionParam, locationParam]);

  const handlePrint = () => {
    window.print();
  };

  const grouped = groupSponsorshipsBySection(records);

  const currentDate = new Date();
  const lunarYearStr = getKhmerLunarHeaderDate(currentDate);
  const solarDateStr = getKhmerSolarDate(currentDate);

  if (loading) {
    return <div className="loading-page">កំពុងទាញយកទិន្នន័យតារាងឧបសម្ព័ន្ធ...</div>;
  }

  return (
    <div className="sponsorship-page" style={{ paddingTop: "1rem" }}>
      {/* Action Bar (Hidden on Print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          background: "#ffffff",
          padding: "0.85rem 1.25rem",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/sponsorships")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <LuArrowLeft size={16} />
          <span>ត្រឡប់ទៅបញ្ជីទិន្នន័យ</span>
        </button>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{
              background: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1.25rem",
              fontWeight: "600",
            }}
          >
            <LuPrinter size={18} />
            <span>បោះពុម្ពតារាងឧបសម្ព័ន្ធ (Print / Save PDF)</span>
          </button>
        </div>
      </div>

      {/* Official Print Layout Container */}
      <div className="appendix-print-container">
        {/* Top Header Row */}
        <div className="appendix-top-row">
          <div className="appendix-org-info">
            <h3 className="appendix-org-title">គណបក្សប្រជាជនកម្ពុជា</h3>
            <h4 className="appendix-org-sub">គណៈកម្មាធិការគណបក្សស្រុកជើងព្រៃ</h4>
          </div>
          <div className="appendix-nation-info">
            <h3 className="appendix-nation-title">ព្រះរាជាណាចក្រកម្ពុជា</h3>
            <h4 className="appendix-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
            <div style={{ textAlign: "center", letterSpacing: "2px", fontSize: "0.8rem", color: "#333" }}>
              3 3 3
            </div>
          </div>
        </div>

        {/* Main Title Block */}
        <div className="appendix-title-block">
          <h2 className="appendix-main-title">តារាងឧបសម្ព័ន្ធ</h2>
          <h3 className="appendix-period-title">
            ស្តីពីការឧបត្ថម្ភថវិកា និងសម្ភាររបស់ថ្នាក់ដឹកនាំ ក្រុមការងារ និងសប្បុរសជន
          </h3>
          {periodParam && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.95rem", fontStyle: "italic" }}>
              (កាលបរិច្ឆេទ ៖ {periodParam} {locationParam ? `| ទីតាំង ៖ ${locationParam}` : ""})
            </p>
          )}
        </div>

        {/* Main Data Table */}
        <table className="appendix-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>ល.រ</th>
              <th style={{ width: "32%" }}>ក្រុមឧបត្ថម្ភ និងឈ្មោះអ្នកឧបត្ថម្ភ</th>
              <th style={{ width: "23%" }}>មុខសម្ភារ និងបរិមាណ</th>
              <th style={{ width: "13%" }}>ថវិកាដុល្លារ ($)</th>
              <th style={{ width: "14%" }}>ថវិការៀល (៛)</th>
              <th style={{ width: "13%" }}>ទីតាំង និងការប្រើប្រាស់</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  មិនមានទិន្នន័យឧបត្ថម្ភក្នុងលក្ខខណ្ឌដែលបានជ្រើសរើសនេះទេ
                </td>
              </tr>
            ) : (
              Object.entries(grouped).map(([sectionTitle, secRecords], secIdx) => {
                const secUSD = secRecords.reduce((sum, r) => sum + (Number(r.amount_usd) || 0), 0);
                const secKHR = secRecords.reduce((sum, r) => sum + (Number(r.amount_khr) || 0), 0);

                return (
                  <Fragment key={sectionTitle}>
                    {/* Section Group Header Row */}
                    <tr className="appendix-table-section-row">
                      <td style={{ textAlign: "center", fontWeight: "700" }}>
                        {toKhmerDigits(secIdx + 1)}
                      </td>
                      <td colSpan={5} style={{ fontWeight: "700" }}>
                        {sectionTitle}
                      </td>
                    </tr>

                    {/* Section Item Rows */}
                    {secRecords.map((r, itemIdx) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: "center" }}>
                          {toKhmerDigits(r.entry_no || itemIdx + 1)}
                        </td>
                        <td>
                          <div style={{ fontWeight: "700" }}>{r.contributor_name || r.donor_name}</div>
                          {r.representatives && (
                            <div style={{ fontSize: "0.82rem", color: "#312e81", fontWeight: "600" }}>
                              {r.representatives}
                            </div>
                          )}
                          {(r.record_period || r.fiscal_year) && (
                            <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                              {r.fiscal_year ? `ឆ្នាំ ${toKhmerDigits(r.fiscal_year)} • ` : ""}កាលបរិច្ឆេទ ៖ {r.record_period}
                            </div>
                          )}
                        </td>
                        <td>
                          {r.items && r.items.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.88rem" }}>
                              {r.items.map((it, iIdx) => (
                                <li key={iIdx}>
                                  <strong>{it.item_name}</strong> ៖ {toKhmerDigits(it.item_qty)} {it.item_unit}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.82rem" }}>
                              (ឧបត្ថម្ភជាថវិកាសុទ្ធ)
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {r.amount_usd > 0 ? toKhmerDigits(r.amount_usd) : "-"}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {r.amount_khr > 0 ? toKhmerDigits(r.amount_khr) : "-"}
                        </td>
                        <td style={{ fontSize: "0.85rem" }}>
                          <div style={{ fontWeight: "600", color: "#1e3a8a" }}>{r.target_location}</div>
                          <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>{r.usage_description}</div>
                          {r.remarks && (
                            <div style={{ fontSize: "0.78rem", color: "#4b5563", marginTop: "0.2rem", fontStyle: "italic" }}>
                              *ផ្សេងៗ ៖ {r.remarks}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Section Subtotal Row */}
                    <tr className="appendix-table-subtotal-row">
                      <td colSpan={3} style={{ textAlign: "right", fontWeight: "700" }}>
                        សរុប {sectionTitle} ៖
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700" }}>
                        {secUSD > 0 ? toKhmerDigits(secUSD) : "-"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700" }}>
                        {secKHR > 0 ? toKhmerDigits(secKHR) : "-"}
                      </td>
                      <td></td>
                    </tr>
                  </Fragment>
                );
              })
            )}

            {/* Master Grand Total Row */}
            {summary && (
              <tr className="appendix-table-grand-total">
                <td colSpan={3} style={{ textAlign: "center", fontWeight: "800" }}>
                  សរុបរួមថវិកាទាំងអស់ (Master Grand Total) ៖
                </td>
                <td style={{ textAlign: "right", fontWeight: "800", color: "#047857" }}>
                  {toKhmerDigits(summary.total_usd)} $
                </td>
                <td style={{ textAlign: "right", fontWeight: "800", color: "#1d4ed8" }}>
                  {toKhmerDigits(summary.total_khr)} ៛
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Section C: Master Appendix Footer Summary Roll-Up */}
        {summary && (
          <div className="appendix-footer-summary">
            <h4>សរុបជារួមមុខសម្ភារ និងថវិកាឧបត្ថម្ភ ៖</h4>

            {/* Inventory Goods Rollup String */}
            {summary.inventory_rollup && summary.inventory_rollup.length > 0 && (
              <p style={{ margin: "0 0 0.5rem" }}>
                <strong>១. មុខសម្ភារឧបត្ថម្ភសរុប ៖ </strong>
                {summary.inventory_rollup
                  .map((inv) => `${inv.item_name} ចំនួន ${toKhmerDigits(inv.total_qty)} ${inv.item_unit}`)
                  .join(", ")}
                ។
              </p>
            )}

            {/* Spelled-out USD Currency */}
            <p style={{ margin: "0 0 0.4rem" }}>
              <strong>២. ថវិកាសរុបជាប្រាក់ដុល្លារ ៖ </strong>
              <span style={{ fontWeight: "700" }}>{toKhmerDigits(summary.total_usd)} ដុល្លារ</span>
              <span style={{ color: "#334155" }}>
                {" "}(អក្សរ ៖ {numberToKhmerWords(summary.total_usd, "USD")})
              </span>
            </p>

            {/* Spelled-out KHR Currency */}
            <p style={{ margin: 0 }}>
              <strong>៣. ថវិកាសរុបជាប្រាក់រៀល ៖ </strong>
              <span style={{ fontWeight: "700" }}>{toKhmerDigits(summary.total_khr)} រៀល</span>
              <span style={{ color: "#334155" }}>
                {" "}(អក្សរ ៖ {numberToKhmerWords(summary.total_khr, "KHR")})
              </span>
            </p>
          </div>
        )}

        {/* 3-Tier Official Audit Signature Block */}
        <div className="appendix-signatures">
          {/* 1. Table Creator */}
          <div className="signature-box">
            <div className="signature-date">ស្រុកជើងព្រៃ, {solarDateStr}</div>
            <div className="signature-role">អ្នកធ្វើតារាង</div>
            <div className="signature-name">ហត្ថលេខា និងឈ្មោះ</div>
          </div>

          {/* 2. Reviewer / Standing Deputy */}
          <div className="signature-box">
            <div className="signature-date">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
            <div className="signature-role">អនុប្រធានប្រចាំការ</div>
            <div className="signature-name">ហត្ថលេខា និងឈ្មោះ</div>
          </div>

          {/* 3. Approver / Committee Chair */}
          <div className="signature-box">
            <div className="signature-date">
              {lunarYearStr}, {solarDateStr}
            </div>
            <div className="signature-role">
              បានឃើញ និងឯកភាព
              <br />
              ប្រធានគណៈកម្មាធិការ
            </div>
            <div className="signature-name">ហត្ថលេខា និងត្រា</div>
          </div>
        </div>
      </div>
    </div>
  );
}
