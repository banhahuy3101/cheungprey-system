import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuDownload, LuX } from "react-icons/lu";
import { performanceAPI } from "../api/performance";
import { partyAPI } from "../api/party";
import { zoneCodeOf } from "../utils/zone";
import { formatPerformancePeriodLabel } from "../utils/periodLabel";

const normalizeId = (id) => String(id || "").toLowerCase();

const periodLabelOf = (p) =>
  formatPerformancePeriodLabel(p.start_date, p.end_date) || p.label_kh || "";

export default function PerformanceList({ onView, onEdit, onCreate }) {
  const [records, setRecords] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaReady, setMetaReady] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [periodInput, setPeriodInput] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const [perRes, zoneRes] = await Promise.all([
        performanceAPI.getPeriods(),
        partyAPI.getZones({ type: "Commune" }),
      ]);
      setPeriods(perRes.data?.data || perRes.data || []);
      const raw = zoneRes.data?.data ?? zoneRes.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      list.sort((a, b) => (a.name_kh || "").localeCompare(b.name_kh || "", "km"));
      setCommunes(list);
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
        .filter((s) => {
          const zCode = String(s.zone_id || "");
          const pID = String(s.period_id || "");
          if (zoneFilter && zCode !== zoneFilter) return false;
          if (periodFilter && normalizeId(pID) !== normalizeId(periodFilter)) return false;
          return true;
        })
        .map((s) => {
          const zCode = String(s.zone_id || "");
          const pID = String(s.period_id || "");
          const commune = communes.find((z) => zoneCodeOf(z) === zCode);
          const period = periods.find((p) => normalizeId(p.id) === normalizeId(pID));
          return {
            zone_code: zCode,
            zone_name: s.zone_name || commune?.name_kh || zCode,
            period_id: pID,
            period_label: s.period_label || period?.label_kh || pID,
            indicator_count: s.indicator_count ?? 0,
          };
        });

      setRecords(enriched);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [communes, periods, zoneFilter, periodFilter]);

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

      <div className="card mb-1">
        <div className="form-row filter-toolbar">
          <div className="form-group">
            <label>ឃុំ/សង្កាត់</label>
            <input
              type="text"
              list="perf-list-commune-list"
              value={zoneInput}
              onChange={(e) => handleZoneInput(e.target.value)}
              placeholder="ទាំងអស់"
            />
            <datalist id="perf-list-commune-list">
              {communes.map((z) => {
                const code = zoneCodeOf(z);
                return <option key={code} value={z.name_kh} />;
              })}
            </datalist>
          </div>
          <div className="form-group">
            <label>រយៈពេល</label>
            <input
              type="text"
              list="perf-list-period-list"
              value={periodInput}
              onChange={(e) => handlePeriodInput(e.target.value)}
              placeholder="ទាំងអស់"
            />
            <datalist id="perf-list-period-list">
              {periods.map((p) => (
                <option key={p.id} value={periodLabelOf(p)} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ឃុំ/សង្កាត់</th>
                <th>រយៈពេល</th>
                <th>ចំនួនសូចនាករ</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    គ្មានទិន្នន័យ — ចុច "បង្កើតថ្មី" ដើម្បីបន្ថែម
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={`${r.zone_code}-${r.period_id}`}>
                    <td>{idx + 1}</td>
                    <td>{r.zone_name}</td>
                    <td>{r.period_label}</td>
                    <td>{r.indicator_count}</td>
                    <td>
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
                          disabled={!!downloadTarget}
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
      )}

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
