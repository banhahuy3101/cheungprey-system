import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { LuSave, LuArrowLeft, LuDownload, LuPencil, LuFileText } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import { partyAPI } from "../../api/party";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import Select from "../Select";
import { formatPerformancePeriodLabel } from "../../utils/periodLabel";
import { unwrapZone, zoneCodeOf, loadZoneHierarchy, resolveSelectedZone } from "../../utils/zone";

const normalizeId = (id) => String(id || "").toLowerCase();

const unwrapList = (res) => {
  const payload = res?.data?.data ?? res?.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.zones && Array.isArray(payload.zones)) return payload.zones;
  return [];
};

export default function PerformanceForm({ mode, zoneCode, periodId }) {
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [villages, setVillages] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");

  // Separate input states for autocomplete (allow free typing)
  const [provinceInput, setProvinceInput] = useState("");
  const [districtInput, setDistrictInput] = useState("");
  const [communeInput, setCommuneInput] = useState("");
  const [villageInput, setVillageInput] = useState("");
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(periodId || "");
  const [indicatorValues, setIndicatorValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingToReport, setSavingToReport] = useState(false);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // Filter search state for table indicators
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSearchValue, setFilterSearchValue] = useState("");

  // Dynamic indicator structure from API
  const [domains, setDomains] = useState([]);
  const [subDomainsByDomain, setSubDomainsByDomain] = useState({});
  const [indicatorsBySub, setIndicatorsBySub] = useState({});
  const [indicatorKeyMap, setIndicatorKeyMap] = useState({});

  const isView = mode === "view";
  const didLoad = useRef(false);

  // Active target zone resolved across levels (village -> commune -> district -> province)
  const targetZone = resolveSelectedZone(selectedVillage, selectedCommune, selectedDistrict, selectedProvince) || zoneCode;

  // Load everything once using single /domains/full endpoint (exactly once)
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    (async () => {
      setLoading(true);
      try {
        const [perRes, provRes, fullRes] = await Promise.all([
          performanceAPI.getPeriods(),
          partyAPI.getZones({ type: "Province" }),
          performanceAPI.getDomainsFull(),
        ]);

        setPeriods(perRes.data?.data || perRes.data || []);
        const rawProvinces = provRes.data?.data?.zones || provRes.data?.data || provRes.data || [];
        setProvinces(Array.isArray(rawProvinces) ? rawProvinces : []);

        const fullDomains = fullRes.data?.data || fullRes.data || [];

        // Flatten for table rendering
        const domList = [];
        const subMap = {};
        const indMap = {};
        const keyMap = {};

        for (const d of fullDomains) {
          domList.push(d);
          subMap[d.id] = d.sub_domains || [];

          for (const sd of d.sub_domains || []) {
            indMap[sd.id] = sd.indicators || [];

            for (const ind of sd.indicators || []) {
              const fullKey = `${d.code}.${sd.code}.${ind.code}`;
              keyMap[fullKey] = {
                data_type: ind.data_type,
                unit_kh: ind.unit_kh,
              };
            }
          }
        }

        setDomains(domList);
        setSubDomainsByDomain(subMap);
        setIndicatorsBySub(indMap);
        setIndicatorKeyMap(keyMap);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load districts when province changes — DISABLED in view/edit mode
  useEffect(() => {
    if (zoneCode) return;
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict("");
      setCommunes([]);
      setSelectedCommune("");
      setVillages([]);
      setSelectedVillage("");
      setDistrictInput("");
      setCommuneInput("");
      setVillageInput("");
      return;
    }
    (async () => {
      try {
        const res = await partyAPI.getZones({ type: "District", parent_code: selectedProvince });
        const raw = res.data?.data?.zones || res.data?.data || res.data || [];
        setDistricts(Array.isArray(raw) ? raw : []);
      } catch { /* empty */ }
    })();
  }, [selectedProvince, zoneCode]);

  // Load communes when district changes — DISABLED in view/edit mode
  useEffect(() => {
    if (zoneCode) return;
    if (!selectedDistrict) {
      setCommunes([]);
      setSelectedCommune("");
      setVillages([]);
      setSelectedVillage("");
      setCommuneInput("");
      setVillageInput("");
      return;
    }
    (async () => {
      try {
        const res = await partyAPI.getZones({ type: "Commune", parent_code: selectedDistrict });
        const raw = res.data?.data?.zones || res.data?.data || res.data || [];
        setCommunes(Array.isArray(raw) ? raw : []);
      } catch { /* empty */ }
    })();
  }, [selectedDistrict, zoneCode]);

  // Load villages when commune changes — DISABLED in view/edit mode
  useEffect(() => {
    if (zoneCode) return;
    if (!selectedCommune) {
      setVillages([]);
      setSelectedVillage("");
      setVillageInput("");
      return;
    }
    (async () => {
      try {
        const res = await partyAPI.getZones({ type: "Village", parent_code: selectedCommune });
        const raw = res.data?.data?.zones || res.data?.data || res.data || [];
        setVillages(Array.isArray(raw) ? raw : []);
      } catch { /* empty */ }
    })();
  }, [selectedCommune, zoneCode]);

  // Pre-select province → district → commune → village (view/edit mode)
  useEffect(() => {
    if (!zoneCode) return;

    (async () => {
      try {
        const h = await loadZoneHierarchy(partyAPI, zoneCode);
        if (!h) return;

        if (h.provinces?.length) setProvinces(h.provinces);
        if (h.districts?.length) setDistricts(h.districts);
        if (h.communes?.length) setCommunes(h.communes);
        if (h.villages?.length) setVillages(h.villages);

        setSelectedProvince(h.province || "");
        setSelectedDistrict(h.district || "");
        setSelectedCommune(h.commune || "");
        setSelectedVillage(h.village || "");

        const pObj = h.provinces?.find((p) => zoneCodeOf(p) === h.province);
        const dObj = h.districts?.find((d) => zoneCodeOf(d) === h.district);
        const cObj = h.communes?.find((c) => zoneCodeOf(c) === h.commune);
        const vObj = h.villages?.find((v) => zoneCodeOf(v) === h.village);

        setProvinceInput(pObj?.name_kh || "");
        setDistrictInput(dObj?.name_kh || "");
        setCommuneInput(cObj?.name_kh || "");
        setVillageInput(vObj?.name_kh || "");
      } catch { /* empty */ }
    })();
  }, [zoneCode]);

  useEffect(() => {
    if (periodId) setSelectedPeriod(normalizeId(periodId));
  }, [periodId]);

  // Load existing values in edit/view mode
  useEffect(() => {
    if (mode === "create") return;
    const loadZone = targetZone;
    const loadPeriod = periodId || selectedPeriod;
    if (!loadZone || !loadPeriod) return;

    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const res = await performanceAPI.getData(loadZone, loadPeriod);
        const rawData = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        const vals = {};
        rawData.forEach((d) => {
          const key = d.indicator_code || "";
          if (!key) return;
          if (d.value_number != null) vals[key] = String(d.value_number);
          else if (d.value_percentage != null) vals[key] = String(d.value_percentage);
          else if (d.value_binary === true) vals[key] = "true";
          else if (d.value_binary === false) vals[key] = "false";
        });
        if (!cancelled) setIndicatorValues(vals);
      } catch {
        if (!cancelled) setIndicatorValues({});
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, zoneCode, periodId, targetZone, selectedPeriod]);

  const handleSave = async () => {
    if (!targetZone) { setError("សូមជ្រើសរើសទីតាំង។"); return; }
    if (!selectedPeriod) { setError("Please select period."); return; }
    setError(""); setSaving(true);
    try {
      const values = [];
      for (const [key, value] of Object.entries(indicatorValues)) {
        if (value === "" || value == null) continue;
        const m = indicatorKeyMap[key] || {};
        const dt = m.data_type || "number";
        const entry = { indicator_code: key };
        if (dt === "number" || dt === "text") entry.value_number = parseFloat(value);
        else if (dt === "percentage") {
          const pct = parseFloat(value);
          if (pct > 100) {
            setError(`ភាគរយមិនអាចលើសពី 100 (${key})`);
            setSaving(false);
            return;
          }
          entry.value_percentage = pct;
        }
        else if (dt === "binary") entry.value_binary = value === "true" || value === true;
        else entry.value_number = parseFloat(value);
        values.push(entry);
      }

      await performanceAPI.bulkCreateData({
        zone_id: targetZone,
        period_id: selectedPeriod,
        values,
      });

      navigate("/performance");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const reportZone = targetZone;
  const reportPeriod = selectedPeriod || periodId;

  const handleSaveToReport = async () => {
    if (!reportZone || !reportPeriod) {
      setError("ជ្រើសរើសទីតាំង និងរយៈពេលមុនបង្កើតរបាយការណ៍");
      return;
    }
    setSavingToReport(true);
    setError("");
    try {
      const villageObj = villages.find((v) => zoneCodeOf(v) === selectedVillage);
      const villageName = villageObj?.name_kh || "";
      const communeObj = communes.find((c) => zoneCodeOf(c) === selectedCommune);
      const communeName = communeObj?.name_kh || "";
      const distObj = districts.find((d) => zoneCodeOf(d) === selectedDistrict);
      const districtName = distObj?.name_kh || "";
      const provObj = provinces.find((p) => zoneCodeOf(p) === selectedProvince);
      const provinceName = provObj?.name_kh || "";

      const locationTitle = villageName || communeName || districtName || provinceName || reportZone;
      const title = `របាយការណ៍លទ្ធផលការងារ - ${locationTitle} (${periodRangeLabel || reportPeriod})`;
      const description = [provinceName, districtName, communeName, villageName].filter(Boolean).join(" » ");

      // Build HTML content with full performance data table
      let tableRows = "";
      let rowNum = 0;
      for (const domain of domains) {
        const subs = subDomainsByDomain[domain.id] || [];
        const domainIndicatorCount = subs.reduce((sum, s) => sum + (indicatorsBySub[s.id]?.length || 0), 0);
        tableRows += `<tr style="background:#e0e7ff;"><td colspan="4" style="padding:8px 10px;font-weight:700;font-size:14px;">${domain.code}. ${domain.name_kh || domain.name}</td></tr>`;
        for (const sub of subs) {
          const indicators = indicatorsBySub[sub.id] || [];
          tableRows += `<tr style="background:#f1f5f9;"><td colspan="4" style="padding:6px 10px 6px 20px;font-weight:600;font-size:13px;">${sub.code}. ${sub.name_kh || sub.name}</td></tr>`;
          for (const ind of indicators) {
            rowNum++;
            const fullKey = `${domain.code}.${sub.code}.${ind.code}`;
            const rawVal = indicatorValues[fullKey];
            let displayVal = "—";
            if (rawVal != null && rawVal !== "") {
              const meta = indicatorKeyMap[fullKey] || {};
              if (meta.data_type === "binary") {
                displayVal = rawVal === "true" || rawVal === true ? "មាន" : "គ្មាន";
              } else if (meta.data_type === "percentage") {
                displayVal = `${rawVal}%`;
              } else {
                displayVal = String(rawVal);
              }
            }
            const unit = indicatorKeyMap[fullKey]?.unit_kh || "";
            tableRows += `<tr><td style="padding:5px 10px;text-align:center;width:40px;">${rowNum}</td><td style="padding:5px 10px;">${ind.name_kh || ind.name}</td><td style="padding:5px 10px;text-align:center;">${unit}</td><td style="padding:5px 10px;text-align:center;font-weight:600;">${displayVal}</td></tr>`;
          }
        }
      }

      const content = `<h2 style="text-align:center;">របាយការណ៍លទ្ធផលការងារ</h2>
<p style="text-align:center;"><strong>${locationTitle}</strong></p>
<p style="text-align:center;">រយៈពេល: ${periodRangeLabel || reportPeriod}</p>
<p>ខេត្ត/រាជធានី: <strong>${provinceName || "—"}</strong> &nbsp; ស្រុក/ខណ្ឌ: <strong>${districtName || "—"}</strong> &nbsp; ឃុំ/សង្កាត់: <strong>${communeName || "—"}</strong> &nbsp; ភូមិ: <strong>${villageName || "—"}</strong></p>
<br/>
<table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
<thead><tr style="background:#1e40af;color:#fff;">
<th style="padding:8px;width:40px;">ល.រ</th>
<th style="padding:8px;text-align:left;">សូចនាករ</th>
<th style="padding:8px;width:80px;">ឯកតា</th>
<th style="padding:8px;width:100px;">តម្លៃ</th>
</tr></thead>
<tbody>${tableRows}</tbody>
</table>`;

      const payload = {
        title,
        description,
        content,
        category: "លទ្ធផលការងារ",
      };

      const res = await reportDocumentsAPI.createSimple(payload);
      const createdId = res.data?.data?.id || res.data?.id;
      if (createdId) {
        navigate(`/reports/${createdId}`);
      } else {
        navigate("/reports");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "បង្កើតរបាយការណ៍មិនបាន");
    } finally {
      setSavingToReport(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportZone || !reportPeriod) {
      setError("ជ្រើសរើសឃុំ/សង្កាត់ និងរយៈពេលមុនទាញយក PDF");
      return;
    }
    setDownloading(true);
    setError("");
    try {
      await performanceAPI.downloadReport(reportZone, reportPeriod);
    } catch {
      setError("ទាញយក PDF មិនបាន");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyFromPrevious = async () => {
    if (!selectedCommune || !selectedPeriod) {
      setError("ជ្រើសរើសឃុំ/សង្កាត់ និងរយៈពេលមុនចម្លង");
      return;
    }
    const currentIdx = periods.findIndex((p) => normalizeId(p.id) === normalizeId(selectedPeriod));
    if (currentIdx <= 0) {
      setError("មិនមានទិន្នន័យពីរយៈពេលមុន");
      return;
    }
    const prevPeriod = periods[currentIdx - 1];
    setCopying(true);
    setError("");
    try {
      const { data } = await performanceAPI.getData(selectedCommune, prevPeriod.id);
      const rawList = data?.data ?? data ?? [];
      if (!Array.isArray(rawList) || rawList.length === 0) {
        setError("មិនមានទិន្នន័យពីរយៈពេលមុន");
        setCopying(false);
        return;
      }
      const newValues = {};
      rawList.forEach((d) => {
        const key = d.indicator_code;
        if (d.data_type === "binary") {
          newValues[key] = d.value_binary === true ? "true" : d.value_binary === false ? "false" : "";
        } else if (d.data_type === "percentage" && d.value_percentage != null) {
          newValues[key] = String(d.value_percentage);
        } else if (d.value_number != null) {
          newValues[key] = String(d.value_number);
        }
      });
      setIndicatorValues((prev) => ({ ...prev, ...newValues }));
      setError("");
    } catch {
      setError("មិនអាចចម្លងទិន្នន័យពីរយៈពេលមុន");
    } finally {
      setCopying(false);
    }
  };

  const selectedPeriodObj = periods.find(
    (p) => normalizeId(p.id) === normalizeId(selectedPeriod || periodId),
  );
  const periodRangeLabel = selectedPeriodObj
    ? formatPerformancePeriodLabel(selectedPeriodObj.start_date, selectedPeriodObj.end_date)
    || selectedPeriodObj.label_kh
    : "";

  return (
    <div className="page" style={{ position: "relative" }}>
      {(loading || dataLoading) && (
        <div className="report-linear-loader" style={{ borderRadius: "8px" }}>
          <div className="report-linear-loader-fill" />
        </div>
      )}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/performance")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">
            {mode === "create" ? "បង្កើតរបាយការណ៍ថ្មី"
              : mode === "edit" ? "កែប្រែរបាយការណ៍"
                : "មើលរបាយការណ៍"}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isView && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/performance/edit?zone_id=${reportZone}&period_id=${reportPeriod}`)}
              >
                <LuPencil /> កែប្រែ
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleSaveToReport}
                disabled={savingToReport || !reportZone || !reportPeriod}
                title="បង្កើតជាឯកសាររបាយការណ៍ផ្លូវការ"
              >
                <LuFileText /> {savingToReport ? "កំពុងបង្កើត..." : "រក្សាទុកជារបាយការណ៍"}
              </button>
            </>
          )}
          {(isView || mode === "edit") && (
            <button
              className="btn btn-secondary"
              onClick={handleDownloadPdf}
              disabled={downloading || !reportZone || !reportPeriod}
            >
              <LuDownload /> {downloading ? "កំពុងទាញយក..." : "ទាញយក PDF"}
            </button>
          )}
          {!isView && (
            <>
              {targetZone && selectedPeriod && (
                <button
                  className="btn btn-secondary"
                  onClick={handleCopyFromPrevious}
                  disabled={copying || saving}
                >
                  {copying ? "កំពុងចម្លង..." : "ចម្លងពីរយៈពេលមុន"}
                </button>
              )}
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || copying}>
                <LuSave /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកទិន្នន័យ"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card mb-1">
        <div className="form-row">
          {/* Province Autocomplete */}
          <div className="form-group">
            <label>ខេត្ត *</label>
            <input
              type="text"
              list="province-list"
              value={provinceInput}
              onChange={(e) => {
                const val = e.target.value;
                setProvinceInput(val);
                const match = provinces.find(p => p.name_kh === val);
                if (match) {
                  setSelectedProvince(match.zone_code || match.code);
                } else {
                  // Clear dependent fields when province is cleared
                  setSelectedProvince("");
                  setSelectedDistrict("");
                  setSelectedCommune("");
                  setSelectedVillage("");
                  setDistrictInput("");
                  setCommuneInput("");
                  setVillageInput("");
                }
              }}
              disabled={isView || mode === "edit"}
              placeholder="-- ជ្រើសរើស --"
            />
            <datalist id="province-list">
              {provinces.map((p) => (
                <option key={p.zone_code || p.code} value={p.name_kh} />
              ))}
            </datalist>
          </div>

          {/* District Autocomplete */}
          <div className="form-group">
            <label>ស្រុក/ខណ្ឌ *</label>
            <input
              type="text"
              list="district-list"
              value={districtInput}
              onChange={(e) => {
                const val = e.target.value;
                setDistrictInput(val);
                const match = districts.find(d => d.name_kh === val);
                if (match) {
                  setSelectedDistrict(match.zone_code || match.code);
                } else {
                  setSelectedDistrict("");
                  setSelectedCommune("");
                  setSelectedVillage("");
                  setCommuneInput("");
                  setVillageInput("");
                }
              }}
              disabled={isView || mode === "edit" || !provinceInput}
              placeholder="-- ជ្រើសរើស --"
            />
            <datalist id="district-list">
              {districts.map((d) => (
                <option key={d.zone_code || d.code} value={d.name_kh} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: "0.5rem" }}>
          {/* Commune Autocomplete */}
          <div className="form-group">
            <label>ឃុំ/សង្កាត់ *</label>
            <input
              type="text"
              list="commune-list"
              value={communeInput}
              onChange={(e) => {
                const val = e.target.value;
                setCommuneInput(val);
                const match = communes.find(c => c.name_kh === val);
                if (match) {
                  setSelectedCommune(match.zone_code || match.code);
                  setSelectedVillage("");
                  setVillageInput("");
                  setIndicatorValues({});
                } else {
                  setSelectedCommune("");
                  setSelectedVillage("");
                  setVillageInput("");
                }
              }}
              disabled={isView || mode === "edit" || !districtInput}
              placeholder="-- ជ្រើសរើស --"
            />
            <datalist id="commune-list">
              {communes.map((c) => (
                <option key={c.zone_code || c.code} value={c.name_kh} />
              ))}
            </datalist>
          </div>

          {/* Village Autocomplete */}
          <div className="form-group">
            <label>ភូមិ</label>
            <input
              type="text"
              list="village-list"
              value={villageInput}
              onChange={(e) => {
                const val = e.target.value;
                setVillageInput(val);
                const match = villages.find(v => v.name_kh === val);
                if (match) {
                  setSelectedVillage(match.zone_code || match.code);
                  setIndicatorValues({});
                } else {
                  setSelectedVillage("");
                }
              }}
              disabled={isView || mode === "edit" || !communeInput}
              placeholder="-- ជ្រើសរើស --"
            />
            <datalist id="village-list">
              {villages.map((v) => (
                <option key={v.zone_code || v.code} value={v.name_kh} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: "0.5rem" }}>
          <div className="form-group">
            <label>រយៈពេល *</label>
            {isView ? (
              <input
                type="text"
                value={periodRangeLabel || selectedPeriodObj?.label_kh || "—"}
                disabled
              />
            ) : (
              <Select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setIndicatorValues({});
                }}
              >
                <option value="">-- ជ្រើសរើស --</option>
                {periods.map((p) => (
                  <option key={p.id} value={normalizeId(p.id)}>
                    {formatPerformancePeriodLabel(p.start_date, p.end_date) || p.label_kh}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>
        {selectedPeriodObj && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
            <strong>ចាប់ពី៖</strong> {selectedPeriodObj.start_date || "—"} &nbsp;|&nbsp; <strong>ដល់៖</strong> {selectedPeriodObj.end_date || "—"}
          </div>
        )}
      </div>

      <div className="card mb-1 perf-form-wrap">
        {dataLoading && (
          <div className="perf-form-loading">កំពុងផ្ទុកទិន្នន័យ...</div>
        )}
        <table className="table perf-form-table">
          <colgroup>
            <col className="perf-col-label" />
            <col className="perf-col-value" />
          </colgroup>
          <thead>
            <tr>
              <th className="perf-column-header perf-indicator-label">សូចនាករ</th>
              <th className="perf-column-header perf-indicator-value">
                ទិន្នន័យ ឬព័ត៌មានលទ្ធផលនៃការអនុវត្ត
              </th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => {
              const subs = subDomainsByDomain[domain.id] || [];
              return (
                <Fragment key={domain.id}>
                  <tr>
                    <td className="perf-domain-header" colSpan={2}>
                      {domain.code}. {domain.name_kh}
                    </td>
                  </tr>
                  {subs.map((sd) => {
                    const inds = indicatorsBySub[sd.id] || [];
                    return (
                      <Fragment key={sd.id}>
                        <tr>
                          <td className="perf-subdomain-header" colSpan={2}>
                            {sd.code}. {sd.name_kh}
                          </td>
                        </tr>
                        {inds.map((ind, idx) => {
                          const dt = ind.data_type || "number";
                          const unit = ind.unit_kh || "";
                          const key = `${domain.code}.${sd.code}.${ind.code}`;
                          const val = indicatorValues[key] ?? "";
                          const hasValue = val !== "" && val != null;
                          const isSelected = val === "true" || val === true;
                          const isNotSelected = val === "false" || val === false;
                          const formatViewValue = () => {
                            if (dt === "binary") {
                              if (isSelected) return "បាន/មាន";
                              if (isNotSelected) return "មិនបាន/គ្មាន";
                              return "—";
                            }
                            if (dt === "percentage" && val !== "" && val != null) return `${val}%`;
                            return val || "—";
                          };
                          return (
                            <tr key={key}>
                              <td className="perf-indicator-label">
                                <span className="perf-indicator-code">{sd.code}.{idx + 1}</span>
                                {ind.name_kh}
                                {unit && <span className="perf-indicator-unit">({unit})</span>}
                                {ind.target_value != null && (dt === "number" || dt === "percentage") && (
                                  <span style={{
                                    fontSize: "0.75rem",
                                    color: "#666",
                                    marginLeft: "0.5rem",
                                  }}>
                                    (គោលដៅ: {ind.target_value}{dt === "percentage" ? "%" : ""}
                                    {ind.target_direction === "higher_is_better" ? " ↑" : ind.target_direction === "lower_is_better" ? " ↓" : ""})
                                  </span>
                                )}
                              </td>
                              <td className="perf-indicator-value">
                                {isView ? (
                                  <strong style={
                                    ind.target_value != null && val !== "" && val != null && (dt === "number" || dt === "percentage")
                                      ? ((ind.target_direction === "lower_is_better" ? parseFloat(val) <= ind.target_value : parseFloat(val) >= ind.target_value)
                                        ? { color: "#059669" } : { color: "#dc2626" })
                                      : undefined
                                  }>{formatViewValue()}</strong>
                                ) : dt === "binary" ? (
                                  <div style={{ display: "flex", gap: "0.35rem" }}>
                                    <button
                                      type="button"
                                      onClick={() => setIndicatorValues((p) => ({ ...p, [key]: "true" }))}
                                      style={{
                                        flex: 1,
                                        padding: "0.4rem 0.5rem",
                                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                                        borderRadius: "4px",
                                        background: isSelected ? "var(--primary)" : "var(--surface)",
                                        color: isSelected ? "#fff" : "var(--text)",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        fontWeight: isSelected ? 600 : 400,
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      បាន/មាន
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIndicatorValues((p) => ({ ...p, [key]: "false" }))}
                                      style={{
                                        flex: 1,
                                        padding: "0.4rem 0.5rem",
                                        border: isNotSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                                        borderRadius: "4px",
                                        background: isNotSelected ? "var(--primary)" : "var(--surface)",
                                        color: isNotSelected ? "#fff" : "var(--text)",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        fontWeight: isNotSelected ? 600 : 400,
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      មិនបាន/គ្មាន
                                    </button>
                                  </div>
                                ) : (
                                  <div className="perf-input-group">
                                    <input
                                      type="number"
                                      step="any"
                                      min={dt === "percentage" ? 0 : (ind.min_value != null ? ind.min_value : undefined)}
                                      max={dt === "percentage" ? 100 : (ind.max_value != null ? ind.max_value : undefined)}
                                      value={val}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (dt === "percentage" && v !== "" && parseFloat(v) > 100) return;
                                        setIndicatorValues((p) => ({ ...p, [key]: v }));
                                      }}
                                      placeholder={dt === "percentage" ? "0-100" : unit || "បញ្ចូល..."}
                                      style={{
                                        width: "100%",
                                        padding: "0.4rem 0.5rem",
                                        border: hasValue ? "2px solid var(--primary)" : "1px solid #d1d5db",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        background: hasValue ? "#eef2ff" : "#fff",
                                        outline: "none",
                                        transition: "all 0.15s ease",
                                      }}
                                    />
                                    {dt === "percentage" && <span className="perf-input-suffix">%</span>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}