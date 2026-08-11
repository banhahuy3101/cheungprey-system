import { zoneCodeOf } from "../utils/zone";
import { zoneOptionLabel } from "../hooks/useZoneCascade";

export default function ZoneCascadeSelect({
  hook,
  provinces: _provinces,
  districts: _districts,
  communes: _communes,
  villages: _villages,
  selectedProvince: _selectedProvince,
  selectedDistrict: _selectedDistrict,
  selectedCommune: _selectedCommune,
  selectedVillage: _selectedVillage,
  onProvinceChange: _onProvinceChange,
  onDistrictChange: _onDistrictChange,
  onCommuneChange: _onCommuneChange,
  onVillageChange: _onVillageChange,
  isLocked: _isLocked,
  showVillage = true,
  compact = false,
}) {
  let provinces = _provinces;
  let districts = _districts;
  let communes = _communes;
  let villages = _villages;
  let selectedProvince = _selectedProvince;
  let selectedDistrict = _selectedDistrict;
  let selectedCommune = _selectedCommune;
  let selectedVillage = _selectedVillage;
  let onProvinceChange = _onProvinceChange;
  let onDistrictChange = _onDistrictChange;
  let onCommuneChange = _onCommuneChange;
  let onVillageChange = _onVillageChange;
  let isLocked = _isLocked;

  if (hook) {
    provinces = hook.provinces;
    districts = hook.districts;
    communes = hook.communes;
    villages = hook.villages;
    selectedProvince = hook.selectedProvince;
    selectedDistrict = hook.selectedDistrict;
    selectedCommune = hook.selectedCommune;
    selectedVillage = hook.selectedVillage;
    onProvinceChange = (code) => hook.setProvince(code);
    onDistrictChange = (code) => hook.setDistrict(code);
    onCommuneChange = (code) => hook.setCommune(code);
    onVillageChange = (code) => hook.setSelectedVillage(code);
    isLocked = hook.isLocked;
    if (hook.showVillage !== undefined) showVillage = hook.showVillage;
  }

  const selectStyle = compact ? {
    height: "2.1rem",
    minHeight: "2.1rem",
    padding: "0.25rem 1.75rem 0.25rem 0.5rem",
    fontSize: "0.82rem",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)"
  } : undefined;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? "0.45rem" : "0.75rem", flex: 1 }}>
      <div className="form-group" style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
        {!compact && <label>ខេត្ត *</label>}
        <select
          value={selectedProvince}
          disabled={isLocked("province")}
          onChange={(e) => onProvinceChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">{compact ? "ខេត្តទាំងអស់" : "ទាំងអស់"}</option>
          {provinces.map((z) => (
            <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
        {!compact && <label>ស្រុក *</label>}
        <select
          value={selectedDistrict}
          disabled={isLocked("district") || !selectedProvince}
          onChange={(e) => onDistrictChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">{compact ? "ស្រុកទាំងអស់" : "ទាំងអស់"}</option>
          {districts.map((z) => (
            <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
        {!compact && <label>ឃុំ *</label>}
        <select
          value={selectedCommune}
          disabled={isLocked("commune") || !selectedDistrict}
          onChange={(e) => onCommuneChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">{compact ? "ឃុំទាំងអស់" : "ទាំងអស់"}</option>
          {communes.map((z) => (
            <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
          ))}
        </select>
      </div>
      {showVillage && (
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
          {!compact && <label>ភូមិ</label>}
          <select
            value={selectedVillage}
            disabled={isLocked("village") || !selectedCommune}
            onChange={(e) => onVillageChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">{compact ? "ភូមិទាំងអស់" : "ទាំងអស់"}</option>
            {villages.map((z) => (
              <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}