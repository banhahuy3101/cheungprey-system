import { useState, useEffect, useCallback, useRef } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuDownload, LuX } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import { partyAPI } from "../../api/party";
import { zoneCodeOf, loadZoneHierarchy, unwrapList } from "../../utils/zone";
import { formatPerformancePeriodLabel } from "../../utils/periodLabel";
import DataTable from "../DataTable";

const normalizeId = (id) => String(id || "").toLowerCase();

const periodLabelOf = (p) =>
  formatPerformancePeriodLabel(p.start_date, p.end_date) || p.label_kh || "";

export default function PerformanceList({ onView, onEdit, onCreate }) {
  const [records, setRecords] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [villages, setVillages] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaReady, setMetaReady] = useState(false);

  const zoneCache = useRef({});

  // 4 Location Level Filters (stored as zone codes)
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState(""); // Commune filter
  const [villageFilter, setVillageFilter] = useState("");

  const [periodFilter, setPeriodFilter] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const [perRes, provRes] = await Promise.all([
        performanceAPI.getPeriods(),
        partyAPI.getZones({ type: "Province" }),
      ]);
      setPeriods(perRes.data?.data || perRes.data || []);
      const rawProv = provRes.data?.data?.zones || provRes.data?.data || provRes.data || [];
      setProvinces(Array.isArray(rawProv) ? rawProv : []);
    } catch {
      //
    } finally {
      setMetaReady(true);
    }
  }, []);

  // Fetch child districts when province filter changes
  useEffect(() => {
    if (!provinceFilter) {
      setDistricts([]);
      setCommunes([]);
      setVillages([]);
      return;
    }
    partyAPI.getZones({ type: "District", parent_code: provinceFilter })
      .then((res) => setDistricts(unwrapList(res)))
      .catch(() => setDistricts([]));
  }, [provinceFilter]);

  // Fetch child communes when district filter changes
  useEffect(() => {
    if (!districtFilter) {
      setCommunes([]);
      setVillages([]);
      return;
    }
    partyAPI.getZones({ type: "Commune", parent_code: districtFilter })
      .then((res) => setCommunes(unwrapList(res)))
      .catch(() => setCommunes([]));
  }, [districtFilter]);

  // Fetch child villages when commune filter changes
  useEffect(() => {
    if (!zoneFilter) {
      setVillages([]);
      return;
    }
    partyAPI.getZones({ type: "Village", parent_code: zoneFilter })
      .then((res) => setVillages(unwrapList(res)))
      .catch(() => setVillages([]));
  }, [zoneFilter]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await performanceAPI.getSubmissions();
      const subs = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      // Pre-resolve zone hierarchy for any unique zone_id in submissions
      const uniqueZoneCodes = [...new Set(subs.map((s) => String(s.zone_id || "")).filter(Boolean))];
      await Promise.all(
        uniqueZoneCodes.map(async (zc) => {
          if (!zoneCache.current[zc]) {
            const h = await loadZoneHierarchy(partyAPI, zc);
            if (h) zoneCache.current[zc] = h;
          }
        })
      );

      const enriched = subs
        .map((s) => {
          const zCode = String(s.zone_id || "");
          const pID = String(s.period_id || "");
          const h = zoneCache.current[zCode];

          const pObj = h?.provinces?.find((p) => zoneCodeOf(p) === h.province);
          const dObj = h?.districts?.find((d) => zoneCodeOf(d) === h.district);
          const cObj = h?.communes?.find((c) => zoneCodeOf(c) === h.commune);
          const vObj = h?.villages?.find((v) => zoneCodeOf(v) === h.village);

          const period = periods.find((p) => normalizeId(p.id) === normalizeId(pID));

          return {
            zone_code: zCode,
            province_code: h?.province || "",
            district_code: h?.district || "",
            commune_code: h?.commune || "",
            village_code: h?.village || "",
            province_name: pObj?.name_kh || s.province_name || "—",
            district_name: dObj?.name_kh || s.district_name || "—",
            commune_name: cObj?.name_kh || (!h?.village ? s.zone_name : "—"),
            village_name: vObj?.name_kh || (h?.village ? s.zone_name : "—"),
            period_id: pID,
            period_label: s.period_label || period?.label_kh || pID,
            indicator_count: s.indicator_count ?? 0,
            status: s.status || "submitted",
            updated_at: s.updated_at ? new Date(s.updated_at).toLocaleDateString("km-KH") : "—",
          };
        })
        .filter((s) => {
          if (provinceFilter && s.province_code !== provinceFilter) return false;
          if (districtFilter && s.district_code !== districtFilter) return false;
          if (zoneFilter && s.commune_code !== zoneFilter && s.zone_code !== zoneFilter) return false;
          if (villageFilter && s.village_code !== villageFilter && s.zone_code !== villageFilter) return false;
          if (periodFilter && normalizeId(s.period_id) !== normalizeId(periodFilter)) return false;
          return true;
        });

      setRecords(enriched);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [periods, provinceFilter, districtFilter, zoneFilter, villageFilter, periodFilter]);

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

  // Integrated loadZoneHierarchy for auto-populating upper location levels on selection
  const handleProvinceChange = (code) => {
    setProvinceFilter(code);
    setDistrictFilter("");
    setZoneFilter("");
    setVillageFilter("");
  };

  const handleDistrictChange = async (code) => {
    setDistrictFilter(code);
    setZoneFilter("");
    setVillageFilter("");
    if (code) {
      const h = await loadZoneHierarchy(partyAPI, code);
      if (h) {
        if (h.province) setProvinceFilter(h.province);
        if (h.districts?.length) setDistricts(h.districts);
      }
    }
  };

  const handleCommuneChange = async (code) => {
    setZoneFilter(code);
    setVillageFilter("");
    if (code) {
      const h = await loadZoneHierarchy(partyAPI, code);
      if (h) {
        if (h.province) setProvinceFilter(h.province);
        if (h.district) setDistrictFilter(h.district);
        if (h.districts?.length) setDistricts(h.districts);
        if (h.communes?.length) setCommunes(h.communes);
      }
    }
  };

  const handleVillageChange = async (code) => {
    setVillageFilter(code);
    if (code) {
      const h = await loadZoneHierarchy(partyAPI, code);
      if (h) {
        if (h.province) setProvinceFilter(h.province);
        if (h.district) setDistrictFilter(h.district);
        if (h.commune) setZoneFilter(h.commune);
        if (h.districts?.length) setDistricts(h.districts);
        if (h.communes?.length) setCommunes(h.communes);
        if (h.villages?.length) setVillages(h.villages);
      }
    }
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

  const filteredDistricts = provinceFilter
    ? districts.filter((d) => d.parent_code === provinceFilter)
    : districts;

  const filteredCommunes = districtFilter
    ? communes.filter((c) => c.parent_code === districtFilter)
    : provinceFilter
      ? communes.filter((c) => districts.some((d) => zoneCodeOf(d) === c.parent_code && d.parent_code === provinceFilter))
      : communes;

  const filteredVillages = zoneFilter
    ? villages.filter((v) => v.parent_code === zoneFilter)
    : districtFilter
      ? villages.filter((v) => communes.some((c) => zoneCodeOf(c) === v.parent_code && c.parent_code === districtFilter))
      : provinceFilter
        ? villages.filter((v) => {
            const comm = communes.find((c) => zoneCodeOf(c) === v.parent_code);
            return districts.some((d) => zoneCodeOf(d) === comm?.parent_code && d.parent_code === provinceFilter);
          })
        : villages;

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

      {/* Filter Card Outside Table */}
      <div className="card mb-1" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          {/* Province Filter */}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>
              រាជធានី/ខេត្ត
            </label>
            <select
              value={provinceFilter}
              onChange={(e) => handleProvinceChange(e.target.value)}
              style={{ width: "100%", height: "2.3rem", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">-- ខេត្តទាំងអស់ --</option>
              {provinces.map((p) => {
                const code = zoneCodeOf(p);
                return (
                  <option key={code} value={code}>
                    {p.name_kh}
                  </option>
                );
              })}
            </select>
          </div>

          {/* District Filter */}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>
              ក្រុង/ស្រុក/ខណ្ឌ
            </label>
            <select
              value={districtFilter}
              onChange={(e) => handleDistrictChange(e.target.value)}
              style={{ width: "100%", height: "2.3rem", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">-- ស្រុកទាំងអស់ --</option>
              {filteredDistricts.map((d) => {
                const code = zoneCodeOf(d);
                return (
                  <option key={code} value={code}>
                    {d.name_kh}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Commune Filter */}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>
              ឃុំ/សង្កាត់
            </label>
            <select
              value={zoneFilter}
              onChange={(e) => handleCommuneChange(e.target.value)}
              style={{ width: "100%", height: "2.3rem", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">-- ឃុំទាំងអស់ --</option>
              {filteredCommunes.map((c) => {
                const code = zoneCodeOf(c);
                return (
                  <option key={code} value={code}>
                    {c.name_kh}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Village Filter */}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>
              ភូមិ
            </label>
            <select
              value={villageFilter}
              onChange={(e) => handleVillageChange(e.target.value)}
              style={{ width: "100%", height: "2.3rem", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">-- ភូមិទាំងអស់ --</option>
              {filteredVillages.map((v) => {
                const code = zoneCodeOf(v);
                return (
                  <option key={code} value={code}>
                    {v.name_kh}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Period Filter */}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>
              រយៈពេល
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              style={{ width: "100%", height: "2.3rem", padding: "0.25rem 0.5rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">-- រយៈពេលទាំងអស់ --</option>
              {periods.map((p) => (
                <option key={p.id} value={normalizeId(p.id)}>
                  {periodLabelOf(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button if any filter active */}
          {(provinceFilter || districtFilter || zoneFilter || villageFilter || periodFilter) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setProvinceFilter("");
                setDistrictFilter("");
                setZoneFilter("");
                setVillageFilter("");
                setPeriodFilter("");
              }}
              style={{ height: "2.3rem", whiteSpace: "nowrap" }}
            >
              <LuX /> កែប្រែជម្រើស
            </button>
          )}
        </div>
      </div>

      {/* Performance DataTable */}
      <DataTable
        columns={[
          {
            key: "idx",
            label: "#",
            width: "40px",
            render: (_, __, i) => i + 1,
          },
          {
            key: "province_name",
            label: "រាជធានី/ខេត្ត",
            render: (val) => val || "—",
          },
          {
            key: "district_name",
            label: "ក្រុង/ស្រុក/ខណ្ឌ",
            render: (val) => val || "—",
          },
          {
            key: "commune_name",
            label: "ឃុំ/សង្កាត់",
            render: (val) => val || "—",
          },
          {
            key: "village_name",
            label: "ភូមិ",
            render: (val) => val || "—",
          },
          {
            key: "period_label",
            label: "រយៈពេល",
            render: (val) => <span style={{ fontWeight: "600", color: "#0f172a" }}>{val || "—"}</span>,
          },
          {
            key: "indicator_count",
            label: "ចំនួនសូចនាករ",
            align: "center",
            render: (val) => <span style={{ fontWeight: "700", color: "#4f46e5" }}>{val || 0}</span>,
          },
          {
            key: "status",
            label: "ស្ថានភាព",
            render: (val) => (
              <span className={`badge ${val === "approved" || val === "published"
                ? "badge-success"
                : val === "submitted" || val === "pending"
                  ? "badge-warning"
                  : "badge-secondary"
                }`}>
                {val === "approved" || val === "published"
                  ? "បានអនុម័ត"
                  : val === "submitted" || val === "pending"
                    ? "រង់ចាំពិនិត្យ"
                    : "សេចក្តីព្រាង"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "សកម្មភាព",
            align: "right",
            width: "140px",
            render: (_, r) => (
              <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
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
            ),
          },
        ]}
        data={records}
        loading={loading}
        emptyMessage="គ្មានទិន្នន័យ — ចុច «បង្កើតថ្មី» ដើម្បីបន្ថែម"
        onRowClick={(r) => onView(r.zone_code, r.period_id)}
      />

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
