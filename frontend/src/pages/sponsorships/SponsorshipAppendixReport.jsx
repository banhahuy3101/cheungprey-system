import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LuPrinter, LuCalendar, LuDownload } from "react-icons/lu";
import { sponsorshipAPI } from "../../api/sponsorship";
import { lunarDate, solarDate, numeric } from "@kdamdev/khmerformat";
import {
  toKhmerDigits,
  numberToKhmerWords,
  getKhmerSolarDate,
  getKhmerLunarHeaderDate,
  getKhmerLunarFullDate,
} from "../../utils/khmerNumberSpelling";
import { groupSponsorshipsBySection } from "../../utils/sponsorshipUtils";
import PageHeader from "../../components/PageHeader";
import "../../style/sponsorships.css";

export default function SponsorshipAppendixReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const periodParam = searchParams.get("period") || "";
  const sectionParam = searchParams.get("section") || "";

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [displayPeriod, setDisplayPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const listRes = await sponsorshipAPI.list({
          section_group: sectionParam || undefined,
          limit: 2000,
        });

        const allList = listRes.data?.data || [];
        let filtered = allList;
        let resolvedPeriodName = periodParam;

        if (periodParam && periodParam.trim() !== "") {
          const decoded = decodeURIComponent(periodParam).trim();
          // 1. Check if periodParam matches a record ID (UUID)
          const matchedById = allList.find(
            (r) => String(r.id).toLowerCase() === periodParam.toLowerCase() || String(r.id).toLowerCase() === decoded.toLowerCase()
          );

          if (matchedById) {
            resolvedPeriodName = matchedById.record_period || (matchedById.fiscal_year ? `ប្រចាំឆ្នាំ ${matchedById.fiscal_year}` : "");
            if (resolvedPeriodName) {
              filtered = allList.filter(
                (r) =>
                  r.record_period === resolvedPeriodName ||
                  (!r.record_period && matchedById.fiscal_year && String(r.fiscal_year) === String(matchedById.fiscal_year))
              );
            } else {
              filtered = [matchedById];
            }
          } else {
            // 2. Filter by period name or fiscal year
            const byPeriod = allList.filter(
              (r) =>
                (r.record_period && r.record_period.trim() === decoded) ||
                (r.fiscal_year && String(r.fiscal_year) === decoded) ||
                (r.record_period && r.record_period.toLowerCase().includes(decoded.toLowerCase()))
            );
            if (byPeriod.length > 0) {
              filtered = byPeriod;
              resolvedPeriodName = decoded;
            } else {
              // If none matched, show all records so table isn't blank
              filtered = allList;
              resolvedPeriodName = "";
            }
          }
        }

        setRecords(filtered);
        setDisplayPeriod(resolvedPeriodName);

        const totalUSD = filtered.reduce((acc, r) => acc + (Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0), 0);
        const totalKHR = filtered.reduce((acc, r) => acc + (Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0), 0);

        const invMap = new Map();
        filtered.forEach((r) => {
          const items = r.items && r.items.length > 0 ? r.items : r.in_kind_items || [];
          items.forEach((it) => {
            if (!it || !it.item_name) return;
            const key = `${it.item_name.trim()}__${(it.item_unit || "").trim()}`;
            if (!invMap.has(key)) {
              invMap.set(key, {
                item_name: it.item_name.trim(),
                item_unit: (it.item_unit || "").trim(),
                total_qty: 0,
              });
            }
            invMap.get(key).total_qty += Number(it.item_qty) || 0;
          });
        });

        setSummary({
          total_usd: totalUSD,
          total_khr: totalKHR,
          total_records: filtered.length,
          inventory_rollup: Array.from(invMap.values()),
        });
      } catch {
        setRecords([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [periodParam, sectionParam]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      setDownloadingPDF(true);

      // Dynamically load html2pdf bundle if not loaded yet
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load PDF export module"));
          document.head.appendChild(script);
        });
      }

      const cleanPeriod = (displayPeriod || "Appendix_Report").replace(/[\s/\\:]+/g, "_");
      const filename = `តារាងឧបសម្ព័ន្ធ_${cleanPeriod}_${reportDate}.pdf`;
      const opt = {
        margin: 0,
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const container = clonedDoc.querySelector(".appendix-paper-container");
            if (container) {
              container.style.padding = "10mm 14mm 8mm 14mm";
              container.style.margin = "0px";
              container.style.border = "none";
              container.style.boxShadow = "none";
              container.style.width = "100%";
              container.style.maxWidth = "100%";
            }
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      await window.html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error("Direct PDF download error:", err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const grouped = groupSponsorshipsBySection(records);
  const expenseRecords = (records || []).filter((r) => r.is_expense_total || Boolean(r.is_expense_label || r.expense_label));
  const totalExpenseUSD = expenseRecords.reduce((sum, r) => sum + (Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0), 0);
  const totalExpenseKHR = expenseRecords.reduce((sum, r) => sum + (Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0), 0);

  const currentDateObj = useMemo(() => {
    if (!reportDate) return new Date();
    const parts = String(reportDate).split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  }, [reportDate]);

  const solar = useMemo(() => solarDate(currentDateObj), [currentDateObj]);
  const lunar = useMemo(() => lunarDate(currentDateObj), [currentDateObj]);

  const solarDateStr = useMemo(
    () => `ថ្ងៃទី ${solar.getDay()} ខែ ${solar.getMonth()} ឆ្នាំ ${solar.getYear()}`,
    [solar]
  );
  const lunarDateStr = useMemo(() => lunar.toString(), [lunar]);

  if (loading) {
    return <div className="loading-page">កំពុងទាញយកទិន្នន័យតារាងឧបសម្ព័ន្ធ...</div>;
  }

  return (
    <div className="sponsorship-page-container">
      <div className="no-print">
        <PageHeader
          title="តារាងឧបសម្ព័ន្ធ ៖ របាយការណ៍ការឧបត្ថម្ភ និងការបែងចែក"
          subtitle={displayPeriod ? `កាលបរិច្ឆេទ ៖ ${displayPeriod}` : `កាលបរិច្ឆេទរបាយការណ៍ ៖ ${solarDateStr} (${lunarDateStr})`}
          showBack={() => navigate("/sponsorships")}
          backText="ត្រឡប់ទៅតារាង"
          breadcrumbs={[
            { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
            { label: "ការឧបត្ថម្ភ", path: "/sponsorships" },
            { label: "តារាងឧបសម្ព័ន្ធ" },
          ]}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "0.4rem 0.85rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <LuCalendar size={18} style={{ color: "#2563eb" }} />
                <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "#334155" }}>
                  ជ្រើសរើសថ្ងៃ ៖
                </span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    fontWeight: "600",
                    color: "#0f172a",
                    cursor: "pointer",
                    background: "transparent",
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.25rem",
                  fontWeight: "600",
                  fontSize: "0.92rem",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  cursor: downloadingPDF ? "not-allowed" : "pointer",
                }}
              >
                <LuDownload size={18} style={{ color: "#059669" }} />
                <span>{downloadingPDF ? "កំពុងបង្កើត PDF..." : "ទាញយកជា PDF (Direct)"}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.25rem",
                  fontWeight: "600",
                  fontSize: "0.92rem",
                  borderRadius: "8px",
                }}
              >
                <LuPrinter size={18} />
                <span>បោះពុម្ពតារាង (Print)</span>
              </button>
            </div>
          }
        />
      </div>

      <div ref={reportRef} className={`appendix-paper-container ${downloadingPDF ? "is-exporting-pdf" : ""}`}>
        {/* Top Header Row: Left (Party Info) & Right (National Motto) */}
        <div className="appendix-top-row">
          <div className="appendix-org-info">
            <div className="appendix-party-title">គណបក្សប្រជាជនកម្ពុជា</div>
            <div className="appendix-committee-title">គណៈកម្មាធិការបក្ស ខេត្តកំពង់ចាម</div>
            <div className="appendix-district-title">គណៈកម្មាធិការបក្ស ស្រុកជើងព្រៃ</div>
          </div>

          <div className="appendix-nation-info">
            <div className="appendix-motto-top">ឯករាជ្យ សន្តិភាព សេរីភាព ប្រជាធិបតេយ្យ</div>
            <div className="appendix-motto-bottom">អព្យាក្រឹត និង វឌ្ឍនភាពសង្គម</div>
          </div>
        </div>

        {/* Middle Document Title */}
        <div className="appendix-title-block">
          <div className="appendix-main-title">
            តារាងឧបសម្ព័ន្ធ ថវិកា សម្ភារ ដែលសប្បុរសជន លោកជំទាវ លោកឧកញ៉ា លោក លោកស្រី
          </div>
          <div className="appendix-sub-title">
            ក្រុមការងារ និងសប្បុរសជន ឧបត្ថម្ភជូន{displayPeriod ? `ប្រចាំ ${displayPeriod}` : "ប្រចាំ ឆ្នាំ ២០២៥"}
          </div>
        </div>

        <table className="appendix-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: "5%", textAlign: "center", verticalAlign: "middle" }}>
                ល.រ
              </th>
              <th rowSpan={2} style={{ width: "23%", textAlign: "center", verticalAlign: "middle" }}>
                គោត្តនាម និង នាម
              </th>
              <th rowSpan={2} style={{ width: "17%", textAlign: "center", verticalAlign: "middle" }}>
                <div>សម្ភារ</div>
                <div>ឯកតា</div>
              </th>
              <th colSpan={2} style={{ width: "18%", textAlign: "center" }}>
                ថវិកា
              </th>
              <th rowSpan={2} style={{ width: "22%", textAlign: "center", verticalAlign: "middle" }}>
                ទីកន្លែងទទួល និង ប្រើប្រាស់
              </th>
              <th rowSpan={2} style={{ width: "15%", textAlign: "center", verticalAlign: "middle" }}>
                ផ្សេងៗ
              </th>
            </tr>
            <tr>
              <th style={{ width: "9%", textAlign: "center" }}>ដុល្លារ</th>
              <th style={{ width: "9%", textAlign: "center" }}>រៀល</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  មិនមានទិន្នន័យឧបត្ថម្ភក្នុងលក្ខខណ្ឌដែលបានជ្រើសរើសនេះទេ
                </td>
              </tr>
            ) : (
              Object.entries(grouped).map(([sectionTitle, secRecords], secIdx) => {
                return (
                  <Fragment key={sectionTitle}>
                    <tr className="appendix-table-section-row">
                      <td colSpan={7} style={{ fontWeight: "700", textAlign: "left", paddingLeft: "36px", verticalAlign: "middle", paddingTop: "0.55rem", paddingBottom: "0.55rem" }}>
                        {sectionTitle}
                      </td>
                    </tr>

                    {(() => {
                      const sectionTotalUSD = secRecords.reduce((acc, r) => acc + (Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0), 0);
                      const sectionTotalKHR = secRecords.reduce((acc, r) => acc + (Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0), 0);

                      // Find custom section expense label if defined on any record in this section
                      const recWithLabel = secRecords.find((r) => r.expense_label || r.is_expense_label);
                      const sectionLabel = recWithLabel ? (recWithLabel.expense_label || recWithLabel.is_expense_label) : `${sectionTitle}`;

                      return (
                        <>
                          {secRecords.map((r, itemIdx) => {
                            const rawItems = r.items && r.items.length > 0 ? r.items : (r.in_kind_items && r.in_kind_items.length > 0 ? r.in_kind_items : []);
                            const itemsList = rawItems.filter((it) => it && it.item_name && it.item_name.trim() !== "");
                            const rowSpan = Math.max(itemsList.length, 1);
                            const hasItems = itemsList.length > 0;
                            const rUsd = Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0;
                            const rKhr = Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0;

                            if (!hasItems) {
                              return (
                                <tr key={r.id || itemIdx}>
                                  <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                    {toKhmerDigits(r.entry_no || itemIdx + 1)}
                                  </td>
                                  <td style={{ verticalAlign: "middle" }}>
                                    <div style={{ fontWeight: "700" }}>{r.contributor_name || r.donor_name}</div>
                                    {r.representatives && (
                                      <div style={{ fontSize: "0.82rem", color: "#312e81", fontWeight: "600" }}>
                                        {r.representatives}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: "center", verticalAlign: "middle" }}></td>
                                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {rUsd > 0 ? `${toKhmerDigits(rUsd)} $` : "-"}
                                  </td>
                                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {rKhr > 0 ? `${toKhmerDigits(rKhr)} ៛` : "-"}
                                  </td>
                                  <td style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                                    <div>{r.usage_description || "-"}</div>
                                  </td>
                                  <td style={{ fontSize: "0.85rem", color: "#4b5563", fontStyle: "italic" }}>
                                    {r.remarks || "-"}
                                  </td>
                                </tr>
                              );
                            }

                            return itemsList.map((it, subIdx) => {
                              const itUsd = Number(it.amount_usd) || Number(it.expense_amount_usd) || Number(it.cash_allocation_usd) || 0;
                              const itKhr = Number(it.amount_khr) || Number(it.expense_amount_khr) || Number(it.cash_allocation_khr) || 0;
                              const displayUsd = itUsd > 0 ? `${toKhmerDigits(itUsd)} $` : (subIdx === 0 && rUsd > 0 && itemsList.every((i) => !Number(i.amount_usd || i.expense_amount_usd || i.cash_allocation_usd)) ? `${toKhmerDigits(rUsd)} $` : "-");
                              const displayKhr = itKhr > 0 ? `${toKhmerDigits(itKhr)} ៛` : (subIdx === 0 && rKhr > 0 && itemsList.every((i) => !Number(i.amount_khr || i.expense_amount_khr || i.cash_allocation_khr)) ? `${toKhmerDigits(rKhr)} ៛` : "-");

                              return (
                                <tr key={`${r.id || itemIdx}-${subIdx}`}>
                                  {subIdx === 0 && (
                                    <>
                                      <td rowSpan={rowSpan} style={{ textAlign: "center", verticalAlign: "middle" }}>
                                        {toKhmerDigits(r.entry_no || itemIdx + 1)}
                                      </td>
                                      <td rowSpan={rowSpan} style={{ verticalAlign: "middle" }}>
                                        <div style={{ fontWeight: "700" }}>{r.contributor_name || r.donor_name}</div>
                                        {r.representatives && (
                                          <div style={{ fontSize: "0.82rem", color: "#312e81", fontWeight: "600" }}>
                                            {r.representatives}
                                          </div>
                                        )}
                                      </td>
                                    </>
                                  )}
                                  <td>
                                    <strong>{it.item_name}</strong>
                                    {(it.item_qty || it.item_unit) && (
                                      <span> {toKhmerDigits(it.item_qty)} {it.item_unit}</span>
                                    )}
                                    {(it.is_expense_label || it.expense_label) && (
                                      <div style={{ marginTop: "0.15rem" }}>
                                        <span style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#b91c1c", padding: "0.1rem 0.4rem", borderRadius: "3px", fontWeight: "600" }}>
                                          {it.is_expense_label || it.expense_label}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {displayUsd}
                                  </td>
                                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {displayKhr}
                                  </td>
                                  <td style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                                    {it.usage_description ? (
                                      <div>{it.usage_description}</div>
                                    ) : subIdx === 0 ? (
                                      <div>{r.usage_description || "-"}</div>
                                    ) : "-"}
                                  </td>
                                  <td style={{ fontSize: "0.85rem", color: "#4b5563", fontStyle: "italic" }}>
                                    {it.remarks || (subIdx === 0 ? r.remarks : "") || "-"}
                                  </td>
                                </tr>
                              );
                            });
                          })}

                          {/* Section Subtotal Row (Right below section item rows) - Display ONLY if is_expense_total is ticked */}
                          {secRecords.some((r) => r.is_expense_total) && (sectionTotalUSD > 0 || sectionTotalKHR > 0) && (
                            <tr className="appendix-table-subtotal-row">
                              <td colSpan={3} style={{ fontWeight: "700", textAlign: "left", paddingLeft: "0.6rem", verticalAlign: "middle" }}>
                                {sectionLabel}
                              </td>
                              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: "700" }}>
                                {sectionTotalUSD > 0 ? `${toKhmerDigits(sectionTotalUSD)} $` : "-"}
                              </td>
                              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: "700" }}>
                                {sectionTotalKHR > 0 ? `${toKhmerDigits(sectionTotalKHR)} ៛` : "-"}
                              </td>
                              <td></td>
                              <td></td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </Fragment>
                );
              })
            )}

          </tbody>
        </table>

        {/* Section C: Master Appendix Footer Summary Roll-Up */}
        {summary && (
          <div className="appendix-footer-summary">
            {/* Inventory Goods Rollup String */}
            {summary.inventory_rollup && summary.inventory_rollup.length > 0 && (
              <p style={{ margin: "0 0 0.25rem" }}>
                <strong>១. មុខសម្ភារឧបត្ថម្ភសរុប ៖ </strong>
                {summary.inventory_rollup
                  .map((inv) => `${inv.item_name} ចំនួន ${toKhmerDigits(inv.total_qty)} ${inv.item_unit}`)
                  .join(", ")}
                ។
              </p>
            )}

            {/* Spelled-out USD Currency */}
            <p style={{ margin: "0 0 0.15rem" }}>
              <strong>សរុបថវិកាដុល្លារ = </strong>
              <span style={{ fontWeight: "700" }}>{toKhmerDigits(summary.total_usd)} ដុល្លារ</span>
              <span style={{ color: "#334155" }}>
                {" "}({numberToKhmerWords(summary.total_usd, "USD")})
              </span>
            </p>

            {/* Spelled-out KHR Currency */}
            <p style={{ margin: 0 }}>
              <strong>និង = </strong>
              <span style={{ fontWeight: "700" }}>{toKhmerDigits(summary.total_khr)} រៀល</span>
              <span style={{ color: "#334155" }}>
                {" "}({numberToKhmerWords(summary.total_khr, "KHR")})
              </span>
            </p>
          </div>
        )}

        {/* 3-Tier Official Audit Signature Block */}
        <div className="appendix-signatures">
          {/* 1. Approver / Standing Committee Chair (Left) */}
          <div className="signature-box">
            <div className="signature-status">បានឃើញ និងឯកភាព</div>
            <div className="signature-date">
              <div>{lunarDateStr}</div>
              <div>{solarDateStr}</div>
            </div>
            <div className="signature-role">
              <div>ជ.គណៈអចិន្ត្រៃយ៍គណបក្សស្រុក</div>
              <div style={{ marginTop: "0.25rem" }}>ប្រធាន</div>
            </div>
            <div className="signature-name">ហត្ថលេខា និងត្រា</div>
          </div>

          {/* 2. Reviewer / Standing Deputy (Center) */}
          <div className="signature-box">
            <div className="signature-status">បានពិនិត្យត្រឹមត្រូវ</div>
            <div className="signature-date">
              <div>{lunarDateStr}</div>
              <div>{solarDateStr}</div>
            </div>
            <div className="signature-role">
              <div>អនុប្រធានប្រចាំការ</div>
            </div>
            <div className="signature-name">ហត្ថលេខា និងឈ្មោះ</div>
          </div>

          {/* 3. Table Creator (Right) */}
          <div className="signature-box">
            <div className="signature-status-placeholder" />
            <div className="signature-date">
              <div>{lunarDateStr}</div>
              <div>ជើងព្រៃ, {solarDateStr}</div>
            </div>
            <div className="signature-role">
              <div>អ្នកធ្វើតារាង</div>
            </div>
            <div className="signature-name">ហត្ថលេខា និងឈ្មោះ</div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="appendix-page-footer">
          <span>Page 1 | 1</span>
        </div>
      </div>
    </div>
  );
}
