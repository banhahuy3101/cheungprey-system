import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LuPrinter, LuCalendarDays, LuDownload } from "react-icons/lu";
import { sponsorshipAPI } from "../../api/sponsorship";
import { lunarDate, solarDate, numeric } from "@kdamdev/khmerformat";
import {
  toKhmerDigits,
  toKhmerDigitsInText,
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
  const periodIdParam = searchParams.get("period_id") || "";
  const sectionParam = searchParams.get("section") || "";

  const [records, setRecords] = useState([]);
  const [periodData, setPeriodData] = useState(null);
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
          period_id: periodIdParam || undefined,
          section_group: sectionParam || undefined,
          limit: 2000,
        });

        const allList = listRes.data?.data || [];
        const filtered = [...allList].sort((a, b) => {
          const noA = Number(a.entry_no) || Number(a.record_id) || 0;
          const noB = Number(b.entry_no) || Number(b.record_id) || 0;
          if (noA && noB && noA !== noB) return noA - noB;
          if (noA && !noB) return -1;
          if (!noA && noB) return 1;
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });
        let resolvedPeriodName = periodParam;
        let fetchedPeriod = null;

        if (periodIdParam) {
          try {
            const pRes = await sponsorshipAPI.getPeriodByID(periodIdParam);
            if (pRes.data?.data) {
              fetchedPeriod = pRes.data.data;
              if (fetchedPeriod.period_name) {
                resolvedPeriodName = fetchedPeriod.period_name;
              }
            }
          } catch {
            // fallback to periodParam
          }
        }

        if (!resolvedPeriodName && periodParam && periodParam.trim() !== "") {
          const decoded = decodeURIComponent(periodParam).trim();
          resolvedPeriodName = decoded;
        }

        setPeriodData(fetchedPeriod);
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
  }, [periodParam, periodIdParam, sectionParam]);

  const handlePrint = () => {
    const cleanPeriod = (displayPeriod || "Appendix_Report").replace(/[\s/\\:]+/g, "_");
    const originalTitle = document.title;
    document.title = `តារាងឧបសម្ព័ន្ធ_${cleanPeriod}_${reportDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      setDownloadingPDF(true);

      // Wait for fonts to be ready before rendering canvas
      if (document.fonts) {
        await document.fonts.ready;
      }

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
        margin: [10, 12, 10, 12], // mm: [top, left, bottom, right] - generous 12mm margins prevent motto clipping
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            // Explicitly copy fonts into the cloned iframe so html2canvas computes correct metrics
            if (document.fonts) {
              document.fonts.forEach((font) => {
                try {
                  clonedDoc.fonts.add(font);
                } catch {
                  // ignore
                }
              });
            }

            const container = clonedDoc.querySelector(".appendix-paper-container");
            if (container) {
              container.style.setProperty("padding", "0px", "important");
              container.style.setProperty("margin", "0px", "important");
              container.style.setProperty("border", "none", "important");
              container.style.setProperty("box-shadow", "none", "important");
              container.style.setProperty("width", "100%", "important");
              container.style.setProperty("max-width", "100%", "important");
            }
            const footer = clonedDoc.querySelector(".appendix-page-footer");
            if (footer) {
              footer.style.setProperty("display", "none", "important");
            }
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: [
            "tr",
            ".appendix-table-section-row",
            ".appendix-table-subtotal-row",
            ".appendix-footer-summary",
            ".appendix-signatures",
            ".signature-box",
          ],
        },
      };
      await window.html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error("Direct PDF download error:", err);
      handlePrint();
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
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <LuPrinter size={18} />
                <span>បោះពុម្ព / រក្សាទុកជា PDF (Save as PDF)</span>
              </button>

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
                <span>{downloadingPDF ? "កំពុងទាញយក..." : "ទាញយកជា PDF (Direct)"}</span>
              </button>
            </div>
          }
        />

        {/* Date Selector Row on its own line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: "0.4rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "0.2rem 0.45rem",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
            }}
          >
            <LuCalendarDays size={15} style={{ color: "#2563eb" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#334155" }}>
              ជ្រើសរើសថ្ងៃធ្វើរបាយការណ៍ ៖
            </span>
            <input
              type="date"
              className="no-calendar-icon"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              onClick={(e) => e.target.showPicker?.()}
              style={{
                border: "none",
                outline: "none",
                width: "105px",
                maxWidth: "110px",
                padding: "0",
                margin: "0",
                fontSize: "0.82rem",
                fontFamily: "inherit",
                fontWeight: "600",
                color: "#0f172a",
                cursor: "pointer",
                background: "transparent",
              }}
            />
          </div>
        </div>
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
            {(() => {
              if (!displayPeriod) {
                return `ក្រុមការងារ និងសប្បុរសជន ឧបត្ថម្ភជូនប្រចាំ ឆ្នាំ ${toKhmerDigits(new Date().getFullYear(), false)}`;
              }
              const trimmed = toKhmerDigitsInText(displayPeriod).trim();
              if (trimmed.startsWith("ប្រចាំ")) {
                return `ក្រុមការងារ និងសប្បុរសជន ឧបត្ថម្ភជូន${trimmed}`;
              }
              return `ក្រុមការងារ និងសប្បុរសជន ឧបត្ថម្ភជូនប្រចាំ ${trimmed}`;
            })()}
          </div>
        </div>

        <table className="appendix-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: "4%", textAlign: "center", verticalAlign: "middle" }}>
                ល.រ
              </th>
              <th rowSpan={2} style={{ width: "18%", textAlign: "center", verticalAlign: "middle" }}>
                គោត្តនាម និង នាម
              </th>
              <th rowSpan={2} style={{ width: "8%", textAlign: "center", verticalAlign: "middle" }}>
                <div>សម្ភារ</div>
                <div>ឯកតា</div>
              </th>
              <th colSpan={2} style={{ width: "18%", textAlign: "center" }}>
                ថវិកា
              </th>
              <th rowSpan={2} style={{ width: "44%", textAlign: "center", verticalAlign: "middle" }}>
                ទីកន្លែងទទួល និង ប្រើប្រាស់
              </th>
              <th rowSpan={2} style={{ width: "8%", textAlign: "center", verticalAlign: "middle" }}>
                ផ្សេងៗ
              </th>
            </tr>
            <tr>
              <th style={{ width: "8%", textAlign: "center" }}>ដុល្លារ</th>
              <th style={{ width: "10%", textAlign: "center" }}>រៀល</th>
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
                const hasSectionName = Boolean(sectionTitle && sectionTitle.trim() !== "");

                return (
                  <Fragment key={sectionTitle || `unnamed-${secIdx}`}>
                    {hasSectionName && (
                      <tr className="appendix-table-section-row" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                        <td colSpan={7} style={{ fontWeight: "700", textAlign: "left", paddingLeft: "36px", verticalAlign: "middle", paddingTop: "0.55rem", paddingBottom: "0.55rem" }}>
                          {toKhmerDigitsInText(sectionTitle)}
                        </td>
                      </tr>
                    )}

                    {(() => {
                      const sectionTotalUSD = secRecords.reduce((acc, r) => acc + (Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0), 0);
                      const sectionTotalKHR = secRecords.reduce((acc, r) => acc + (Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0), 0);

                      // Find custom section expense label if defined on any record in this section
                      const recWithLabel = secRecords.find((r) => r.expense_label || r.is_expense_label);
                      const rawSectionLabel = recWithLabel
                        ? (recWithLabel.expense_label || recWithLabel.is_expense_label)
                        : (hasSectionName ? sectionTitle : "សរុប");
                      const sectionLabel = toKhmerDigitsInText(rawSectionLabel);

                      return (
                        <>
                          {secRecords.map((r, itemIdx) => {
                            const rawItems = r.items && r.items.length > 0 ? r.items : (r.in_kind_items && r.in_kind_items.length > 0 ? r.in_kind_items : []);
                            const itemsList = rawItems.filter((it) => it && it.item_name && it.item_name.trim() !== "");
                            const hasItems = itemsList.length > 0;
                            const rUsd = Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0;
                            const rKhr = Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0;

                            return (
                              <tr key={r.id || itemIdx} style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                <td style={{ textAlign: "center", verticalAlign: "top" }}>
                                  {toKhmerDigits(r.entry_no || itemIdx + 1)}
                                </td>
                                <td style={{ verticalAlign: "top" }}>
                                  <div style={{ fontWeight: "700" }}>{toKhmerDigitsInText(r.contributor_name || r.donor_name)}</div>
                                  {r.representatives && (
                                    <div style={{ fontSize: "0.82rem", color: "#312e81", fontWeight: "600", marginTop: "0.2rem" }}>
                                      {toKhmerDigitsInText(r.representatives)}
                                    </div>
                                  )}
                                </td>
                                <td style={{ verticalAlign: "top" }}>
                                  {hasItems ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                      {itemsList.map((it, sIdx) => (
                                        <div key={sIdx} style={{ lineHeight: 1.5 }}>
                                          <strong>{toKhmerDigitsInText(it.item_name)}</strong>
                                          {(it.item_qty || it.item_unit) && (
                                            <span> {toKhmerDigits(it.item_qty)} {toKhmerDigitsInText(it.item_unit)}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : "-"}
                                </td>
                                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", verticalAlign: "top" }}>
                                  {rUsd > 0 ? `${toKhmerDigits(rUsd)} $` : "-"}
                                </td>
                                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", verticalAlign: "top" }}>
                                  {rKhr > 0 ? `${toKhmerDigits(rKhr)} ៛` : "-"}
                                </td>
                                <td style={{ fontSize: "0.84rem", verticalAlign: "top", lineHeight: "22px", letterSpacing: "0.01px", wordBreak: "break-word" }}>
                                  {r.usage_description ? (
                                    String(r.usage_description)
                                      .split(/\r?\n/)
                                      .map((line, lIdx) => (
                                        <div key={lIdx} style={{ minHeight: line.trim() === "" ? "12px" : undefined, lineHeight: "22px", marginBottom: "4px" }}>
                                          {toKhmerDigitsInText(line) || "\u00A0"}
                                        </div>
                                      ))
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td style={{ fontSize: "0.84rem", color: "#4b5563", fontStyle: "italic", verticalAlign: "top", lineHeight: "22px", letterSpacing: "0.01px", wordBreak: "break-word" }}>
                                  {r.remarks ? (
                                    String(r.remarks)
                                      .split(/\r?\n/)
                                      .map((line, lIdx) => (
                                        <div key={lIdx} style={{ minHeight: line.trim() === "" ? "12px" : undefined, lineHeight: "22px", marginBottom: "4px" }}>
                                          {toKhmerDigitsInText(line) || "\u00A0"}
                                        </div>
                                      ))
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Section Subtotal Row (Right below section item rows) - Display ONLY if is_expense_total is ticked */}
                          {secRecords.some((r) => r.is_expense_total) && (sectionTotalUSD > 0 || sectionTotalKHR > 0) && (
                            <tr className="appendix-table-subtotal-row" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
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
            {/* Inventory Goods Rollup String or Period Materials Summary */}
            {(periodData?.materials_summary || (summary.inventory_rollup && summary.inventory_rollup.length > 0)) && (
              <p style={{ margin: "0 0 0.25rem" }}>
                <strong>១. មុខសម្ភារឧបត្ថម្ភសរុប ៖ </strong>
                {periodData?.materials_summary
                  ? toKhmerDigitsInText(periodData.materials_summary)
                  : summary.inventory_rollup
                    .map((inv) => `${toKhmerDigitsInText(inv.item_name)} ចំនួន ${toKhmerDigits(inv.total_qty)} ${toKhmerDigitsInText(inv.item_unit)}`)
                    .join(", ") + " ។"}
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
