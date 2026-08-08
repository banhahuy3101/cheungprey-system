import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuDownload, LuX } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import { partyAPI } from "../../api/party";
import { zoneCodeOf } from "../../utils/zone";
import { formatPerformancePeriodLabel } from "../../utils/periodLabel";

const normalizeId = (id) => String(id || "").toLowerCase();

const periodLabelOf = (p) =>
  formatPerformancePeriodLabel(p.start_date, p.end_date) || p.label_kh || "";

export default function PerformanceList({ onView, onEdit, onCreate }) {
  const [records, setRecords] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaReady, setMetaReady] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [periodInput, setPeriodInput] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const [perRes, provRes, distRes, commRes] = await Promise.all([
        performanceAPI.getPeriods(),
        partyAPI.getZones({ type: "Province" }),
        partyAPI.getZones({ type: "District" }),
        partyAPI.getZones({ type: "Commune" }),
      ]);
      setPeriods(perRes.data?.data || perRes.data || []);

      const rawProv = provRes.data?.data?.zones || provRes.data?.data || provRes.data || [];
      const rawDist = distRes.data?.data?.zones || distRes.data?.data || distRes.data || [];
      const rawComm = commRes.data?.data?.zones || commRes.data?.data || commRes.data || [];

      setProvinces(Array.isArray(rawProv) ? rawProv : []);
      setDistricts(Array.isArray(rawDist) ? rawDist : []);
      const commList = Array.isArray(rawComm) ? rawComm : [];
      commList.sort((a, b) => (a.name_kh || "").localeCompare(b.name_kh || "", "km"));
      setCommunes(commList);
    } catch {
      //
    } finally {
      setMetaReady(true);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await performanceAPI.getSubmissions();
      const subs = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      const enriched = subs
        .map((s) => {
          const zCode = String(s.zone_id || "");
          const pID = String(s.period_id || "");
          const commune = communes.find((z) => zoneCodeOf(z) === zCode);
          const district = communes.length ? districts.find((d) => zoneCodeOf(d) === commune?.parent_code) : null;
          const province = district ? provinces.find((p) => zoneCodeOf(p) === district?.parent_code) : null;
          const period = periods.find((p) => normalizeId(p.id) === normalizeId(pID));

          return {
            zone_code: zCode,
            province_name: province?.name_kh || s.province_name || "—",
            district_name: district?.name_kh || s.district_name || "—",
            commune_name: commune?.name_kh || s.zone_name || zCode,
            period_id: pID,
            period_label: s.period_label || period?.label_kh || pID,
            indicator_count: s.indicator_count ?? 0,
            status: s.status || "submitted",
            updated_at: s.updated_at ? new Date(s.updated_at).toLocaleDateString("km-KH") : "—",
          };
        })
        .filter((s) => {
          if (zoneFilter && s.zone_code !== zoneFilter) return false;
          if (provinceFilter && !(s.province_name || "").toLowerCase().includes(provinceFilter.toLowerCase())) return false;
          if (districtFilter && !(s.district_name || "").toLowerCase().includes(districtFilter.toLowerCase())) return false;
          if (periodFilter && normalizeId(s.period_id) !== normalizeId(periodFilter)) return false;
          return true;
        });

      setRecords(enriched);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [communes, districts, provinces, periods, zoneFilter, provinceFilter, districtFilter, periodFilter]);

  const handleDownload = async (record) => {
    setDownloadTarget(record);
    setMessage("");
    try {
      await performanceAPI.downloadReport(record.zone_code, record.period_id);
    } catch {
      setMessage("ទាញយក PDF មិនបាន");
    } finally {
      setDownloadTarget(null);
    }
  };

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!metaReady) return;
    fetchRecords();
  }, [metaReady, fetchRecords]);

  const handleZoneInput = (val) => {
    setZoneInput(val);
    if (!val.trim()) {
      setZoneFilter("");
      return;
    }
    const match = communes.find((c) => c.name_kh === val);
    setZoneFilter(match ? zoneCodeOf(match) : "");
  };

  const handlePeriodInput = (val) => {
    setPeriodInput(val);
    if (!val.trim()) {
      setPeriodFilter("");
      return;
    }
    const match = periods.find((p) => periodLabelOf(p) === val);
    setPeriodFilter(match ? normalizeId(match.id) : "");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await performanceAPI.deleteDataByZoneAndPeriod(
        deleteTarget.zone_code,
        deleteTarget.period_id,
      );
      setMessage("លុបដោយជោគជ័យ");
      setDeleteTarget(null);
      fetchRecords();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("លុបមិនបាន");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">
          បញ្ជីរបាយការណ៍លទ្ធផលការងារ
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" onClick={onCreate}>
            <LuPlus /> បង្កើតថ្មី
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`}>
          {message}
        </div>
      )}

      {/* Datalists for table column autocomplete filters */}
      <datalist id="perf-list-commune-list">
        {communes.map((z) => {
          const code = zoneCodeOf(z);
          return <option key={code} value={z.name_kh} />;
        })}
      </datalist>
      <datalist id="perf-list-period-list">
        {periods.map((p) => (
          <option key={p.id} value={periodLabelOf(p)} />
        ))}
      </datalist>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              {loading && (
                <tr>
                  <th colSpan={7} style={{ padding: 0, height: "4px", border: "none", background: "transparent" }}>
                    <div className="report-linear-loader" style={{ position: "relative", borderRadius: 0 }}>
                      <div className="report-linear-loader-fill" />
                    </div>
                  </th>
                </tr>
              )}
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <span>រាជធានី/ខេត្ត</span>
                    <select
                      value={provinceFilter}
                      onChange={(e) => setProvinceFilter(e.target.value)}
                      style={{ width: "100%", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: "normal", background: "#fff" }}
                    >
                      <option value="">ទាំងអស់ (All)</option>
                      {provinces.map((p) => (
                        <option key={zoneCodeOf(p)} value={p.name_kh}>
                          {p.name_kh}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <span>ក្រុង/ស្រុក/ខណ្ឌ</span>
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      style={{ width: "100%", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: "normal", background: "#fff" }}
                    >
                      <option value="">ទាំងអស់ (All)</option>
                      {districts.map((d) => (
                        <option key={zoneCodeOf(d)} value={d.name_kh}>
                          {d.name_kh}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <span>ឃុំ/សង្កាត់</span>
                    <select
                      value={zoneFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setZoneFilter(val);
                        const match = communes.find((c) => zoneCodeOf(c) === val);
                        setZoneInput(match ? match.name_kh : "");
                      }}
                      style={{ width: "100%", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: "normal", background: "#fff" }}
                    >
                      <option value="">ទាំងអស់ (All)</option>
                      {communes.map((c) => {
                        const code = zoneCodeOf(c);
                        return (
                          <option key={code} value={code}>
                            {c.name_kh}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <span>រយៈពេល</span>
                    <select
                      value={periodFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPeriodFilter(val);
                        const match = periods.find((p) => normalizeId(p.id) === normalizeId(val));
                        setPeriodInput(match ? periodLabelOf(match) : "");
                      }}
                      style={{ width: "100%", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: "normal", background: "#fff" }}
                    >
                      <option value="">ទាំងអស់ (All)</option>
                      {periods.map((p) => (
                        <option key={p.id} value={normalizeId(p.id)}>
                          {periodLabelOf(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th>ចំនួនសូចនាករ</th>
                <th>ស្ថានភាព</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
              {records.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: "3rem" }}>
                    គ្មានទិន្នន័យ — ចុច "បង្កើតថ្មី" ដើម្បីបន្ថែម
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr
                    key={`${r.zone_code}-${r.period_id}`}
                    onClick={() => onView(r.zone_code, r.period_id)}
                    style={{ cursor: "pointer" }}
                    className="clickable-row"
                  >
                    <td>{idx + 1}</td>
                    <td>{r.province_name}</td>
                    <td>{r.district_name}</td>
                    <td>{r.commune_name}</td>
                    <td>{r.period_label}</td>
                    <td>{r.indicator_count}</td>
                    <td>
                      <span className={`badge ${r.status === "approved" || r.status === "published"
                        ? "badge-success"
                        : r.status === "submitted" || r.status === "pending"
                          ? "badge-warning"
                          : "badge-secondary"
                        }`}>
                        {r.status === "approved" || r.status === "published"
                          ? "បានអនុម័ត"
                          : r.status === "submitted" || r.status === "pending"
                            ? "រង់ចាំពិនិត្យ"
                            : "សេចក្តីព្រាង"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="actions">
                        <button
                          className="btn-icon"
                          onClick={() => onView(r.zone_code, r.period_id)}
                          title="មើល"
                        >
                          <LuEye />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => onEdit(r.zone_code, r.period_id)}
                          title="កែប្រែ"
                        >
                          <LuPencil />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => setDeleteTarget(r)}
                          title="លុប"
                        >
                          <LuTrash2 />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDownload(r)}
                          disabled={downloadTarget?.zone_code === r.zone_code && downloadTarget?.period_id === r.period_id}
                          title="ទាញយក PDF"
                        >
                          <LuDownload />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {downloadTarget && (
        <div className="modal-overlay modal-overlay-top">
          <div className="modal modal-loading" onClick={(e) => e.stopPropagation()}>
            <div className="modal-loading-spinner" aria-hidden="true" />
            <p className="modal-loading-title">កំពុងទាញយក PDF...</p>
            <p className="modal-loading-detail">
              {downloadTarget.zone_name} — {downloadTarget.period_label}
            </p>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>លុបរបាយការណ៍</h3>
              <button className="btn-icon" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                <LuX />
              </button>
            </div>
            <div className="modal-body">
              <p className="reset-confirm-text">
                តើអ្នកពិតជាចង់លុបទិន្នន័យរបាយការណ៍សម្រាប់{" "}
                <strong>{deleteTarget.zone_name}</strong> ({deleteTarget.period_label})?
              </p>
              <p className="user-settings-help" style={{ marginBottom: 0 }}>
                សូចនាករ {deleteTarget.indicator_count} នឹងត្រូវលុបទាំងអស់។
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                បោះបង់
              </button>
              <button type="button" className="btn btn-primary btn-danger-solid" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "កំពុងលុប..." : "លុប"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
