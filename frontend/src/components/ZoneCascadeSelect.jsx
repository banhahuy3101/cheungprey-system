import { useMemo } from "react";
import { zoneCodeOf } from "../utils/zone";
import { zoneOptionLabel } from "../hooks/useZoneCascade";
import FormDropdown from "./FormDropdown";

function toOptions(zones) {
  return (zones || []).map((z) => ({
    value: zoneCodeOf(z),
    label: zoneOptionLabel(z),
  }));
}

export default function ZoneCascadeSelect({
  hook: _hook,
  cascade: _cascade,
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
  disabled = false,
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

  const activeHook = _hook || _cascade;
  if (activeHook) {
    provinces = activeHook.provinces;
    districts = activeHook.districts;
    communes = activeHook.communes;
    villages = activeHook.villages;
    selectedProvince = activeHook.selectedProvince;
    selectedDistrict = activeHook.selectedDistrict;
    selectedCommune = activeHook.selectedCommune;
    selectedVillage = activeHook.selectedVillage;
    onProvinceChange = (code) => activeHook.setProvince && activeHook.setProvince(code);
    onDistrictChange = (code) => activeHook.setDistrict && activeHook.setDistrict(code);
    onCommuneChange = (code) => activeHook.setCommune && activeHook.setCommune(code);
    onVillageChange = (code) => activeHook.setSelectedVillage && activeHook.setSelectedVillage(code);
    isLocked = activeHook.isLocked;
    if (activeHook.showVillage !== undefined) showVillage = activeHook.showVillage;
  }

  if (typeof isLocked !== "function") {
    isLocked = () => false;
  }

  const provinceOptions = useMemo(() => toOptions(provinces), [provinces]);
  const districtOptions = useMemo(() => toOptions(districts), [districts]);
  const communeOptions = useMemo(() => toOptions(communes), [communes]);
  const villageOptions = useMemo(() => toOptions(villages), [villages]);

  const allPlaceholder = "ទាំងអស់";
  const allLabel = (text) => compact ? `${text}ទាំងអស់` : allPlaceholder;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? "0.45rem" : "0.75rem", flex: 1 }}>
      <div style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
        <FormDropdown
          label={compact ? undefined : "ខេត្ត *"}
          value={selectedProvince}
          onChange={(e) => onProvinceChange(e.target.value)}
          options={provinceOptions}
          placeholder={allLabel("ខេត្ត")}
          disabled={disabled || isLocked("province")}
          compact={compact}
        />
      </div>
      <div style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
        <FormDropdown
          label={compact ? undefined : "ស្រុក *"}
          value={selectedDistrict}
          onChange={(e) => onDistrictChange(e.target.value)}
          options={districtOptions}
          placeholder={allLabel("ស្រុក")}
          disabled={disabled || isLocked("district") || !selectedProvince}
          compact={compact}
        />
      </div>
      <div style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
        <FormDropdown
          label={compact ? undefined : "ឃុំ *"}
          value={selectedCommune}
          onChange={(e) => onCommuneChange(e.target.value)}
          options={communeOptions}
          placeholder={allLabel("ឃុំ")}
          disabled={disabled || isLocked("commune") || !selectedDistrict}
          compact={compact}
        />
      </div>
      {showVillage && (
        <div style={{ margin: 0, flex: 1, minWidth: compact ? 110 : 140 }}>
          <FormDropdown
            label={compact ? undefined : "ភូមិ"}
            value={selectedVillage}
            onChange={(e) => onVillageChange(e.target.value)}
            options={villageOptions}
            placeholder={allLabel("ភូមិ")}
            disabled={disabled || isLocked("village") || !selectedCommune}
            compact={compact}
          />
        </div>
      )}
    </div>
  );
}
