import Select from "./Select";
import { zoneCodeOf } from "../utils/zone";
import { zoneOptionLabel } from "../hooks/useZoneCascade";

export default function ZoneCascadeSelect({
  hook,
  provinces,
  districts,
  communes,
  villages,
  selectedProvince,
  selectedDistrict,
  selectedCommune,
  selectedVillage,
  onProvinceChange,
  onDistrictChange,
  onCommuneChange,
  onVillageChange,
  isLocked,
  showVillage = true,
  compact = false,
}) {
  if (hook) {
    provinces = hook.provinces;
    districts = hook.districts;
    communes = hook.communes;
    villages = hook.villages;
    selectedProvince = hook.selectedProvince;
    selectedDistrict = hook.selectedDistrict;
    selectedCommune = hook.selectedCommune;
    selectedVillage = hook.selectedVillage;
    onProvinceChange = hook.onProvinceChange;
    onDistrictChange = hook.onDistrictChange;
    onCommuneChange = hook.onCommuneChange;
    onVillageChange = hook.onVillageChange;
    isLocked = hook.isLocked;
    if (hook.showVillage !== undefined) showVillage = hook.showVillage;
  }
  const gridStyle = compact
    ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }
    : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" };

  return (
    <div style={gridStyle}>
      <div className="form-group" style={{ margin: 0 }}>
        <label>ខេត្ត</label>
        <Select
          value={selectedProvince}
          disabled={isLocked("province")}
          onChange={(e) => onProvinceChange(e.target.value)}
        >
          <option value="">—</option>
          {provinces.map((z) => (
            <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
          ))}
        </Select>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>ស្រុក</label>
        <Select
          value={selectedDistrict}
          disabled={isLocked("district") || !selectedProvince}
          onChange={(e) => onDistrictChange(e.target.value)}
        >
          <option value="">—</option>
          {districts.map((z) => (
            <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
          ))}
        </Select>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>ឃុំ *</label>
        <Select
          value={selectedCommune}
          disabled={isLocked("commune") || !selectedDistrict}
          onChange={(e) => onCommuneChange(e.target.value)}
        >
          <option value="">—</option>
          {communes.map((z) => (
            <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
          ))}
        </Select>
      </div>
      {showVillage && (
        <div className="form-group" style={{ margin: 0 }}>
          <label>ភូមិ</label>
          <Select
            value={selectedVillage}
            disabled={isLocked("village") || !selectedCommune}
            onChange={(e) => onVillageChange(e.target.value)}
          >
            <option value="">— ភូមិ —</option>
            {villages.map((z) => (
              <option key={zoneCodeOf(z)} value={zoneCodeOf(z)}>{zoneOptionLabel(z)}</option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
